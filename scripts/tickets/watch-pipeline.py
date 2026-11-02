#!/usr/bin/env python3
"""Acompanha o pipeline do GitHub Actions e transforma falha de CI em ticket.

O CI deste repositório é a última barreira antes da `main`, mas ele roda longe do
terminal: quem empurra o commit não vê o job ficar vermelho. Este script fecha essa
distância em três comandos:

    watch-pipeline.py watch   [--ref <branch>] [--run <id>] [--timeout <s>] [--poll <s>]
    watch-pipeline.py report  [--run <id>] [--ref <branch>]
    watch-pipeline.py triage  [--run <id>] [--ref <branch>] [--ticket TCK-NNNN] [--dry-run]

`watch` acompanha a execução enquanto ela acontece, imprimindo cada job que muda de
estado; `report` só dá o veredito de um run que já terminou; `triage` abre o ticket de
`bug` quando o run falhou, já com o job, o passo, o trecho do log, o SHA e o link.

Nada aqui gira em laço quente: o acompanhamento dorme entre uma consulta e outra, como
manda o orçamento de CPU do projeto (`docs/uso/orcamento-de-cpu.md`).

Nenhum segredo entra no ticket. Toda linha de log que cheire a credencial vira
`[redigido]` antes de ser escrita em qualquer arquivo — o log do Actions carrega linhas
de ambiente, e um ticket é um arquivo versionado e público.

Códigos de saída: 0 o run passou (ou não havia nada a fazer) / 1 o run falhou /
2 erro de uso, `gh` ausente ou não autenticado, run inexistente.
"""

from __future__ import annotations

import argparse
import importlib.util
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

# Mesmo padrão do `check-ticket-ref.py`: o contrato de ticket vive num lugar só, e este
# script consome o módulo em vez de reimplementar parsing de front matter.
_spec = importlib.util.spec_from_file_location("ticket", ROOT / "scripts" / "tickets" / "ticket.py")
ticket = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ticket)

OK, FAILED, ERROR = 0, 1, 2

# Uma linha do log que case com isto não é resumida nem citada: é substituída inteira.
# Preferimos redigir demais a vazar de menos — o ticket vai para o git.
SECRET = re.compile(r"(?i)(token|secret|password|key|authorization|bearer)")

# Ruído de encerramento do runner. Nunca é a causa da falha e enche o trecho do log.
NOISE = re.compile(
    r"^(Post job cleanup|Cleaning up orphan|Pruning is unnecessary|Temporarily overriding HOME"
    r"|Adding repository directory|\[command\]/usr/bin/git |git version |http\.https"
    r"|Node\.js 20 is deprecated|Node 20 is being deprecated)"
)

TICKET_REF = re.compile(r"\((TCK-\d{4})\)")
LOG_PREFIX = re.compile(r"^[^\t]*\t[^\t]*\t\d{4}-\d{2}-\d{2}T[\d:.]+Z ")

# Job do `.github/workflows/ci.yml` → área da taxonomia de tickets. A chave é procurada
# no nome de exibição do job, que é o que a API devolve.
JOB_AREAS = [
    ("surface", ["qualidade/gates"]),
    ("test / lint / typecheck", ["qualidade/testes"]),
    ("ticket", ["qualidade/gates"]),
    ("harness", ["qualidade/gates"]),
]
# Passo que fala de documentação ou diagrama acrescenta a área de docs.
DOC_STEP = re.compile(r"(?i)(docs?|mermaid|diagram)")

LOG_WINDOW = 40


# --- utilidades -----------------------------------------------------------


def die(*lines: str) -> int:
    for line in lines:
        print(f"watch-pipeline: {line}", file=sys.stderr)
    return ERROR


class Refused(Exception):
    """Erro previsto: vira mensagem clara e código 2, nunca stack trace."""


def gh(*args: str, check: bool = True) -> str:
    proc = subprocess.run(["gh", *args], capture_output=True, text=True, cwd=ROOT)
    if check and proc.returncode != 0:
        detail = (proc.stderr or proc.stdout).strip().splitlines()
        raise Refused(
            f"`gh {' '.join(args)}` falhou (código {proc.returncode}).",
            *(detail[:3] or ["sem detalhe do gh."]),
        )
    return proc.stdout


def ensure_gh() -> None:
    if shutil.which("gh") is None:
        raise Refused(
            "o `gh` não está instalado nesta máquina.",
            "instale o GitHub CLI: https://cli.github.com",
        )
    proc = subprocess.run(["gh", "auth", "status"], capture_output=True, text=True, cwd=ROOT)
    if proc.returncode != 0:
        raise Refused("o `gh` não está autenticado.", "rode `gh auth login` e tente de novo.")


def current_ref() -> str:
    out = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True, cwd=ROOT
    )
    return out.stdout.strip() or "main"


def jq(*args: str) -> str:
    return gh(*args)


def latest_run_id(ref: str) -> str:
    raw = gh(
        "run", "list", "--branch", ref, "--limit", "1",
        "--json", "databaseId", "--jq", ".[0].databaseId",
    ).strip()
    if not raw:
        raise Refused(f"nenhuma execução do CI na branch `{ref}`.", "empurre um commit antes.")
    return raw


def fetch(run_id: str) -> dict:
    import json

    fields = "databaseId,status,conclusion,headSha,headBranch,url,displayTitle,workflowName,jobs"
    raw = gh("run", "view", run_id, "--json", fields)
    try:
        return json.loads(raw)
    except ValueError as exc:  # pragma: no cover - a API mudou de forma
        raise Refused(f"resposta do `gh run view {run_id}` não é JSON: {exc}") from exc


def resolve(args) -> str:
    if args.run:
        return str(args.run)
    return latest_run_id(args.ref or current_ref())


# --- veredito -------------------------------------------------------------


def failed_jobs(run: dict) -> list[dict]:
    return [j for j in run.get("jobs", []) if j.get("conclusion") in ("failure", "timed_out")]


def failed_steps(job: dict) -> list[str]:
    return [s["name"] for s in job.get("steps", []) if s.get("conclusion") in ("failure", "timed_out")]


def verdict(run: dict) -> tuple[int, list[str]]:
    """Devolve (código de saída, linhas do veredito)."""
    head = [
        f"run:      {run['databaseId']}  ({run.get('workflowName', 'ci')})",
        f"commit:   {run.get('headSha', '')[:12]}  {run.get('displayTitle', '')}",
        f"branch:   {run.get('headBranch', '-')}",
        f"link:     {run.get('url', '-')}",
    ]
    if run.get("status") != "completed":
        return OK, head + [f"estado:   {run.get('status')} — ainda rodando."]
    if run.get("conclusion") == "success":
        return OK, head + ["veredito: verde. Todos os jobs passaram."]
    bad = failed_jobs(run)
    lines = head + [f"veredito: VERMELHO ({run.get('conclusion')})."]
    for job in bad:
        steps = ", ".join(failed_steps(job)) or "passo não identificado"
        lines.append(f"  ✗ {job['name']} — passo: {steps}")
    for job in run.get("jobs", []):
        if job not in bad:
            lines.append(f"  · {job['name']} — {job.get('conclusion')}")
    if not bad:
        lines.append("  nenhum job marcado como falho — veja o run no navegador.")
    return FAILED, lines


# --- log ------------------------------------------------------------------


def redact(line: str) -> str:
    return "[redigido]" if SECRET.search(line) else line


def relevant_log(run_id: str, limit: int = LOG_WINDOW) -> list[str]:
    """As últimas linhas úteis do log dos passos que falharam, já redigidas.

    `gh run view --log-failed` devolve o log inteiro do job falho, com prefixo de job,
    passo e timestamp, e termina em ruído de limpeza do runner. Cortamos o prefixo,
    removemos o ruído e centramos a janela no último `##[error]`, que é onde o Actions
    marca a falha de verdade.
    """
    raw = gh("run", "view", run_id, "--log-failed", check=False)
    lines = []
    for line in raw.splitlines():
        text = LOG_PREFIX.sub("", line).rstrip()
        if not text or NOISE.match(text):
            continue
        lines.append(redact(text))
    if not lines:
        return ["(o `gh` não devolveu log dos passos que falharam)"]
    marks = [i for i, t in enumerate(lines) if "##[error]" in t]
    end = marks[-1] + 1 if marks else len(lines)
    return lines[max(0, end - limit):end]


# --- áreas ----------------------------------------------------------------


def areas_for(run: dict) -> list[str]:
    areas: list[str] = []
    for job in failed_jobs(run):
        name = job["name"].lower()
        for key, mapped in JOB_AREAS:
            if key in name:
                areas.extend(mapped)
        for step in failed_steps(job):
            if DOC_STEP.search(step):
                areas.append("docs/spec")
    if not areas:
        areas = ["qualidade/gates"]
    seen: list[str] = []
    for area in areas:
        if area not in seen and area in ticket.AREAS:
            seen.append(area)
    return seen


# --- corpo do ticket ------------------------------------------------------


def set_section(body: str, title: str, content: str) -> str:
    """Troca o conteúdo da seção `## <title>`, preservando as demais."""
    marker = f"\n## {title}\n"
    if marker not in body:
        return body.rstrip() + f"\n\n## {title}\n\n{content.strip()}\n"
    head, _, tail = body.partition(marker)
    rest = ""
    nxt = tail.find("\n## ")
    if nxt != -1:
        rest = tail[nxt:]
    return head + marker + "\n" + content.strip() + "\n" + rest


def compose_body(template_body: str, run: dict, log: list[str]) -> str:
    bad = failed_jobs(run)
    job_names = ", ".join(f"`{j['name']}`" for j in bad) or "`(nenhum job marcado)`"
    steps = ", ".join(f"`{s}`" for j in bad for s in failed_steps(j)) or "`(passo não identificado)`"
    sha = run.get("headSha", "")
    body = template_body

    body = set_section(body, "Sintoma", (
        f"O pipeline `{run.get('workflowName', 'ci')}` ficou vermelho na branch "
        f"`{run.get('headBranch', '-')}`.\n\n"
        f"- Job que falhou: {job_names}\n"
        f"- Passo: {steps}\n"
        f"- Conclusão do run: `{run.get('conclusion')}`\n"
        f"- Run: {run.get('url', '-')}\n\n"
        "Trecho do log dos passos que falharam (linhas com cara de credencial já saíram "
        "como `[redigido]`):\n\n"
        "```text\n" + "\n".join(log) + "\n```"
    ))

    body = set_section(body, "Reprodução", (
        "1. `git switch " + run.get("headBranch", "main") + "` e "
        f"`git checkout {sha[:12]}`.\n"
        "2. Rode localmente o mesmo alvo do job que falhou "
        "(`make test`, `make lint`, `make typecheck`, `make quality`, `make sync-check`, "
        "`make tickets` ou `make cpu-check`, conforme o passo acima).\n"
        "3. Compare a saída com o trecho do log.\n\n"
        "Esperado: o alvo termina verde, como na `main`.\n"
        f"Obtido: o mesmo erro do run {run['databaseId']}."
    ))

    body = set_section(body, "Alcance", (
        f"- Desde quando: commit `{sha[:12]}` — {run.get('displayTitle', '')}\n"
        f"- Quem é afetado: quem trabalha na branch `{run.get('headBranch', '-')}`; "
        "enquanto o job estiver vermelho, o incremento não fecha.\n"
        "- Dado corrompido? Não — falha de pipeline não toca o banco de nenhuma família."
    ))

    body = set_section(body, "Causa raiz", (
        "TODO: preencher com `arquivo:linha` depois de reproduzir localmente. O trecho de "
        "log acima é sintoma, não causa."
    ))

    body = set_section(body, "Entrega", (
        "Bug exige issue no GitHub antes da branch, e o PR fecha a issue.\n\n"
        "- Issue: \n- Branch: \n- PR: \n\n"
        f"Run de origem: {run.get('url', '-')}"
    ))
    return body


def existing_for_run(run_id: str) -> str | None:
    for path in ticket.tickets():
        meta, _ = ticket.parse(path)
        if str(meta.get("run") or "") == str(run_id):
            return meta["id"]
    return None


def origin_ticket(run: dict, override: str | None) -> str | None:
    if override:
        return override.upper()
    match = TICKET_REF.search(run.get("displayTitle", ""))
    return match.group(1) if match else None


# --- comandos -------------------------------------------------------------


def cmd_report(args) -> int:
    ensure_gh()
    run = fetch(resolve(args))
    code, lines = verdict(run)
    print("\n".join(lines))
    return code


def cmd_watch(args) -> int:
    ensure_gh()
    poll = max(10, int(args.poll))
    run_id = resolve(args)
    deadline = time.monotonic() + int(args.timeout)
    print(f"acompanhando o run {run_id} (poll {poll}s, teto {args.timeout}s). Ctrl-C sai.")
    seen: dict[str, tuple[str, str]] = {}
    while True:
        run = fetch(run_id)
        for job in run.get("jobs", []):
            state = (job.get("status", ""), job.get("conclusion") or "")
            if seen.get(job["name"]) != state:
                seen[job["name"]] = state
                mark = {"success": "✓", "failure": "✗", "skipped": "–", "cancelled": "–"}.get(
                    state[1], "·"
                )
                tail = f" ({state[1]})" if state[1] else ""
                print(f"  {mark} {job['name']}: {state[0]}{tail}")
        if run.get("status") == "completed":
            print()
            code, lines = verdict(run)
            print("\n".join(lines))
            if code == FAILED:
                print()
                print(f"para abrir o ticket: python3 scripts/tickets/watch-pipeline.py triage --run {run_id}")
            return code
        if time.monotonic() >= deadline:
            print(f"\nteto de {args.timeout}s atingido e o run {run_id} ainda não terminou.")
            print(f"retome com: python3 scripts/tickets/watch-pipeline.py watch --run {run_id}")
            return FAILED
        # Dormir, não girar: o orçamento de CPU do projeto vale também aqui.
        time.sleep(poll)


def open_issue(ticket_id: str, title: str, run: dict, job_label: str) -> int | None:
    """Open the GitHub issue the `bug` policy requires, and return its number.

    Best effort on purpose: without `gh`, or without the labels, the ticket is
    still worth having. The failure is printed, never raised.
    """
    body = (
        f"Ticket: **{ticket_id}**\n\n"
        f"Aberto automaticamente pelo monitor de pipeline a partir de um run vermelho.\n\n"
        f"- Job: `{job_label}`\n"
        f"- Run: {run.get('url', '')}\n"
        f"- Commit: `{(run.get('headSha') or '')[:12]}`\n\n"
        f"O sintoma, o passo culpado e o trecho de log estão no ticket "
        f"(`tickets/{ticket_id}-*.md`). Log já redigido de segredo.\n\n"
        "## Critério de aceite\n\n"
        "- [ ] O passo que falhou passa a rodar verde no CI\n"
        "- [ ] Teste ou gate que falha antes da correção e passa depois\n"
        "- [ ] A causa raiz está escrita no ticket, com evidência\n"
    )
    try:
        out = gh("issue", "create", "--title", f"CI vermelho em {job_label} ({ticket_id})",
                 "--label", "tipo/bug,qualidade/gates", "--body", body, check=True)
    except Exception as exc:  # noqa: BLE001 - the ticket matters more than the issue
        print(f"aviso: não consegui abrir a issue ({exc}). "
              f"Abra à mão e rode `ticket.py set {ticket_id} --issue <N>`.", file=sys.stderr)
        return None
    number = out.strip().rsplit("/", 1)[-1]
    return int(number) if number.isdigit() else None


def cmd_triage(args) -> int:
    ensure_gh()
    run_id = resolve(args)
    run = fetch(run_id)
    code, lines = verdict(run)
    print("\n".join(lines))
    print()
    if run.get("status") != "completed":
        print("o run ainda está rodando — nada a triar. Use `watch` para acompanhar.")
        return OK
    if code == OK:
        print("o run passou: nenhum ticket foi aberto.")
        return OK

    already = existing_for_run(run_id)
    if already:
        print(f"o run {run_id} já tem ticket: {already}. Nenhum ticket novo foi aberto.")
        return OK

    areas = areas_for(run)
    log = relevant_log(run_id)
    origin = origin_ticket(run, args.ticket)
    bad = failed_jobs(run)
    job_label = bad[0]["name"] if bad else "pipeline"
    title = f"CI vermelho em {job_label} no run {run_id}"

    template_meta, template_body = ticket.parse(ticket.TEMPLATES / "bug.md")
    preview = compose_body(template_body, run, log)

    if args.dry_run:
        print("--dry-run: nada foi gravado. O ticket sairia assim:\n")
        print(f"tipo:     bug")
        print(f"título:   {title}")
        print(f"áreas:    {', '.join(areas)}")
        print(f"prioridade: p1")
        print(f"run:      {run_id}")
        print(f"related:  {origin or '(o commit não cita ticket)'}")
        print(f"fluxo:    triagem → especificacao → pronto, dono software-delivery-engineer")
        print("\n---8<--- corpo ---8<---")
        print(preview.replace("{{ID}}", "TCK-XXXX").replace("{{TITLE}}", title).strip())
        print("---8<--- fim ---8<---")
        return OK

    out = subprocess.run(
        [
            sys.executable, str(ROOT / "scripts" / "tickets" / "ticket.py"), "new",
            "--type", "bug", "--title", title,
            "--areas", ",".join(areas), "--priority", "p1",
        ],
        capture_output=True, text=True, cwd=ROOT,
    )
    if out.returncode != 0:
        raise Refused("o `ticket.py new` recusou o ticket.", *(out.stderr.strip().splitlines()[:3]))
    new_id = out.stdout.split("\t")[0].strip()
    path = ticket.find(new_id)
    meta, body = ticket.parse(path)
    meta["run"] = run_id
    if origin:
        meta["related"] = sorted(set((meta.get("related") or []) + [origin]))
    body = compose_body(body, run, log)
    ticket.save(path, meta, body)
    ticket.log(path, *ticket.parse(path), (
        f"**watch-pipeline** abriu o ticket a partir do run [{run_id}]({run.get('url', '')}), "
        f"job `{job_label}`. Falha de CI não reabre o ticket de origem: este é ticket novo, "
        f"ligado por `related`."
    ))

    # A `bug` ticket needs a GitHub issue before review — `ticket.py validate` says
    # so, and the ticket this command opens is always a bug. Creating it here is
    # what keeps the two halves of the flow from contradicting each other. One run
    # opens one ticket, so it also opens at most one issue.
    if not args.no_issue:
        issue = open_issue(new_id, meta["title"], run, job_label)
        if issue:
            meta["issue"] = issue
            ticket.save(path, meta, ticket.parse(path)[1])
            print(f"issue aberta: #{issue}")

    flow = [
        ["move", new_id, "especificacao", "--by", "watch-pipeline",
         "--note", "o sintoma já veio do run; falta a causa raiz"],
        ["set", new_id, "--acceptance", "definido"],
        ["move", new_id, "pronto", "--by", "watch-pipeline",
         "--note", "critério de aceite é o do template de bug: teste que falha antes e passa depois"],
        ["handoff", new_id, "--from", "watch-pipeline", "--to", "software-delivery-engineer",
         "--note", f"reproduza o passo que falhou no run {run_id} localmente antes de mexer no código; "
                   "o trecho de log no ticket é sintoma, não causa raiz"],
    ]
    for step in flow:
        res = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "tickets" / "ticket.py"), *step],
            capture_output=True, text=True, cwd=ROOT,
        )
        if res.returncode != 0:
            print(f"aviso: `ticket.py {step[0]}` recusou — {res.stderr.strip()}", file=sys.stderr)
            break
    ticket.write_index()
    print(f"ticket aberto: {new_id} ({path.relative_to(ROOT)}) — pronto, com "
          "`software-delivery-engineer`.")
    return FAILED


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="watch-pipeline.py", description=__doc__.splitlines()[0]
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    def common(p):
        p.add_argument("--run", help="id do run; o padrão é o run mais recente do ref")
        p.add_argument("--ref", help="branch a consultar; o padrão é a branch atual")

    p = sub.add_parser("watch", help="acompanha o run até terminar")
    common(p)
    p.add_argument("--timeout", type=int, default=1800, help="teto de espera em segundos (padrão 1800)")
    p.add_argument("--poll", type=int, default=20, help="intervalo entre consultas em segundos (padrão 20, mínimo 10)")
    p.set_defaults(func=cmd_watch)

    p = sub.add_parser("report", help="só o veredito, sem esperar")
    common(p)
    p.set_defaults(func=cmd_report)

    p = sub.add_parser("triage", help="abre ticket de bug quando o run falhou")
    common(p)
    p.add_argument("--ticket", help="ticket de origem a ligar em `related` (padrão: o citado no commit)")
    p.add_argument("--no-issue", action="store_true",
                   help="não abrir a issue no GitHub (o ticket continua sendo criado)")
    p.add_argument("--dry-run", action="store_true", help="imprime o ticket sem gravar nada")
    p.set_defaults(func=cmd_triage)

    args = parser.parse_args()
    try:
        return args.func(args)
    except Refused as exc:
        return die(*exc.args)
    except KeyboardInterrupt:
        print("\ninterrompido.", file=sys.stderr)
        return ERROR


if __name__ == "__main__":
    sys.exit(main())
