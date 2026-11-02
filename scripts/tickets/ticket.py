#!/usr/bin/env python3
"""Ticket CLI for cceak.

Every request the user makes in this project becomes a ticket under `tickets/`.
The ticket is the single place where the agent loop keeps state: status, areas,
acceptance criteria, handoff ledger and the loop guardrail counters.

Storage is plain Markdown with a small YAML-ish front matter, so a ticket is
readable on GitHub, diffable in git and editable by hand when needed.

Usage:
    ticket.py new --type feature --title "..." [--areas a,b] [--priority p2]
    ticket.py list [--status s] [--area a] [--type t] [--json]
    ticket.py show <id>
    ticket.py board
    ticket.py move <id> <status> --by <agent> [--note "..."]
    ticket.py handoff <id> --from <agent> --to <agent> [--note "..."]
    ticket.py challenge <id> --by <agent> --verdict ok|objecao --note "..."
    ticket.py accept <id> --by <agent> [--note "..."]
    ticket.py reject <id> --by <agent> --note "..."
    ticket.py git-plan <id>
    ticket.py set <id> [--issue N] [--pr N] [--branch b] [--owner a]
    ticket.py reopen <id> --by <agent> --note "..."
    ticket.py index
    ticket.py validate [--strict] [--dir <pasta>] [--offline]
    ticket.py selftest

Exit codes: 0 ok / 1 validation failure / 2 refused (invalid transition,
guardrail tripped, unknown ticket).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
TICKETS = ROOT / "tickets"
TEMPLATES = TICKETS / "templates"
FIXTURES = ROOT / "scripts" / "tickets" / "fixtures"
INDEX = TICKETS / "INDEX.md"
BANNER = "<!-- managed-by:cceak/tickets — do not edit by hand -->"

# --- contract -------------------------------------------------------------

TYPES = ["feature", "bug", "docs", "chore", "spike", "external-setup", "research"]

# Kanban columns, in flow order. `bloqueado` and `cancelado` are side states.
FLOW = [
    "triagem",
    "especificacao",
    "pronto",
    "em-andamento",
    "revisao",
    "contestado",
    "aceite",
    "concluido",
]
SIDE = ["bloqueado", "cancelado"]
STATUSES = FLOW + SIDE

TRANSITIONS = {
    "triagem": ["especificacao", "bloqueado", "cancelado"],
    "especificacao": ["pronto", "triagem", "bloqueado", "cancelado"],
    "pronto": ["em-andamento", "especificacao", "bloqueado", "cancelado"],
    "em-andamento": ["revisao", "bloqueado", "cancelado"],
    "revisao": ["contestado", "aceite", "bloqueado"],
    "contestado": ["em-andamento", "bloqueado", "cancelado"],
    "aceite": ["concluido", "contestado"],
    "concluido": [],
    "bloqueado": ["triagem", "pronto", "em-andamento", "cancelado"],
    "cancelado": [],
}

# Which part of the system the ticket acts on. The tag is the routing key.
AREAS = [
    "plataforma/backend",
    "plataforma/frontend",
    "plataforma/dados",
    "plataforma/ia",
    "plataforma/api-publica",
    "plataforma/infra",
    "plataforma/seguranca",
    "manual/app",
    "manual/uso",
    "manual/configuracao",
    "pesquisa/web",
    "pesquisa/rag",
    "docs/projeto",
    "docs/uso",
    "docs/spec",
    "docs/decisao",
    "dominio/instituicao",
    "dominio/espiritismo",
    "conteudo/estudos",
    "conteudo/palestras",
    "conteudo/eventos",
    "qualidade/testes",
    "qualidade/gates",
]

PRIORITIES = ["p0", "p1", "p2", "p3"]
ACCEPTANCE = ["pendente", "definido", "aprovado", "reprovado"]

# Delivery policy per type: branch prefix, conventional-commit type, whether a
# GitHub issue must exist before the branch, and whether the change goes through
# a pull request instead of a direct push to `main`.
GIT_POLICY = {
    "bug": {"branch": "fix", "commit": "fix", "issue": True, "pr": True},
    "feature": {"branch": "feat", "commit": "feat", "issue": True, "pr": True},
    "spike": {"branch": "spike", "commit": "chore", "issue": True, "pr": True},
    "external-setup": {"branch": "docs", "commit": "docs", "issue": False, "pr": False},
    "docs": {"branch": "docs", "commit": "docs", "issue": False, "pr": False},
    "chore": {"branch": "chore", "commit": "chore", "issue": False, "pr": False},
    "research": {"branch": "docs", "commit": "docs", "issue": False, "pr": False},
}

MAX_ROUNDS = 3
MAX_CHALLENGES = 2

LIST_KEYS = {"areas", "related"}
INT_KEYS = {"rounds", "max_rounds", "challenges", "max_challenges", "issue", "pr"}


# --- front matter ---------------------------------------------------------


def parse(path: Path) -> tuple[dict, str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise SystemExit(f"{path}: sem front matter")
    _, fm, body = text.split("---\n", 2)
    meta: dict = {}
    for line in fm.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, _, value = line.partition(":")
        key, value = key.strip(), value.strip()
        if key in LIST_KEYS:
            value = value.strip("[]")
            meta[key] = [v.strip() for v in value.split(",") if v.strip()]
        elif key in INT_KEYS:
            meta[key] = int(value) if value.lstrip("-").isdigit() else None
        else:
            meta[key] = value
    return meta, body


def dump(meta: dict, body: str) -> str:
    order = [
        "id", "title", "type", "status", "areas", "priority", "owner",
        "acceptance", "rounds", "max_rounds", "challenges", "max_challenges",
        "issue", "pr", "branch", "related", "created", "updated",
    ]
    lines = []
    for key in order + [k for k in meta if k not in order]:
        if key not in meta or meta[key] is None or meta[key] == "":
            continue
        value = meta[key]
        if isinstance(value, list):
            value = "[" + ", ".join(value) + "]"
        lines.append(f"{key}: {value}")
    return "---\n" + "\n".join(lines) + "\n---\n" + body


def save(path: Path, meta: dict, body: str) -> None:
    meta["updated"] = today()
    path.write_text(dump(meta, body), encoding="utf-8")


def today() -> str:
    return dt.date.today().isoformat()


def slugify(text: str) -> str:
    norm = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", norm.lower()).strip("-")
    return slug[:48] or "ticket"


def tickets(base: Path | None = None) -> list[Path]:
    return sorted(p for p in (base or TICKETS).glob("TCK-*.md") if p.is_file())


def find(ticket_id: str) -> Path:
    ticket_id = ticket_id.upper()
    if not ticket_id.startswith("TCK-"):
        ticket_id = f"TCK-{int(ticket_id):04d}"
    for path in tickets():
        if path.name.startswith(ticket_id + "-") or path.stem == ticket_id:
            return path
    raise SystemExit(f"ticket {ticket_id} não existe em tickets/")


def next_id() -> str:
    used = [int(p.name[4:8]) for p in tickets() if p.name[4:8].isdigit()]
    return f"TCK-{max(used, default=0) + 1:04d}"


LEDGER = re.compile(r"^## Histórico[ \t]*$", re.MULTILINE)
SECTION = re.compile(r"^## ", re.MULTILINE)

# --- delivery link: issue ↔ PR ↔ ticket -----------------------------------

# Statuses in which the link has to be recorded. Before `aceite` the work may
# still be in flight; from `aceite` on, the delivery is a fact and has to be
# reachable from the ticket alone.
LINKED = ("aceite", "concluido")

ENTREGA = re.compile(r"^## Entrega\b[^\n]*$", re.MULTILINE)
ENTREGA_FIELD = re.compile(r"^[ \t]*[-*][ \t]*(Issue|Branch|PR)[ \t]*:[ \t]*(.*)$", re.MULTILINE)
GH_LINK = re.compile(r"https://github\.com/[^\s)\]>]+")

# The verdict on the issue is a **structured** token, not a word in the prose:
# `fechada:#<PR>` or `aberta:TCK-NNNN`. Matching "fechada" as a word let a line
# like "segue aberta, será fechada depois" — no successor, nothing done — pass
# the gate, and "com a porta fechada do escritório" too (TCK-0021, objeção 1).
VERDICT = re.compile(r"`(fechada|aberta):(#\d+|TCK-\d{4})`")
VERDICT_HELP = "`fechada:#<PR>` ou `aberta:TCK-NNNN` (o ticket sucessor que responde pela issue)"


def entrega(body: str) -> dict[str, str]:
    """Read the `- Issue:`, `- Branch:` and `- PR:` lines of `## Entrega`.

    Only that section is read: the same words appear in the prose of half the
    tickets, and a ticket that *talks* about a PR has not delivered one.
    """
    found = ENTREGA.search(body)
    if not found:
        return {}
    nxt = SECTION.search(body, found.end())
    section = body[found.end():nxt.start() if nxt else len(body)]
    return {key.lower(): value.strip() for key, value in ENTREGA_FIELD.findall(section)}


def closure_problems(meta: dict, body: str, alive: set[str], known: set[str] | None = None) -> list[str]:
    """Fail a ticket that was delivered without recording issue ↔ PR ↔ ticket.

    The hole this closes (TCK-0021): four tickets reached `concluido` with the
    issue still open, because nothing ever checked. `git-plan` only *printed*
    `Closes #N` as a suggestion, and `validate` stopped at "the issue exists".

    The check is deliberately offline. The pre-commit hook and the CI job that
    run it have no reason to hold a GitHub token, and a gate that needs the
    network turns into a red build somebody switches off in the first week.
    What it reads is the ticket's own record; `validate --online` is the
    optional reconciliation against GitHub.

    An issue is allowed to stay open in exactly one case: the verification
    reproved and a successor ticket carries the rest. That escape has teeth —
    the successor has to exist and still be open, so "aberta, sucessor
    TCK-9999" stops passing the moment TCK-9999 closes.
    """
    if not GIT_POLICY.get(meta.get("type"), {}).get("pr") or meta.get("status") not in LINKED:
        return []
    problems: list[str] = []
    fields = entrega(body)
    if not fields:
        return [f"`{meta['status']}` sem a seção `## Entrega` com as linhas `- Issue:`, `- Branch:` e `- PR:`"]
    if not meta.get("pr"):
        problems.append(
            f"`{meta['status']}` sem `pr:` no front matter — registre o PR que entregou "
            f"(`ticket.py set {meta['id']} --pr <N>`)"
        )
    for key, label in (("issue", "Issue"), ("branch", "Branch"), ("pr", "PR")):
        if not fields.get(key):
            problems.append(f"`## Entrega` tem `- {label}:` em branco")
    issue_line, pr_line = fields.get("issue", ""), fields.get("pr", "")
    if meta.get("issue") and issue_line and f"#{meta['issue']}" not in issue_line:
        problems.append(f"`## Entrega` não cita a issue `#{meta['issue']}` do front matter")
    if meta.get("pr") and pr_line and f"#{meta['pr']}" not in pr_line:
        problems.append(f"`## Entrega` não cita o PR `#{meta['pr']}` do front matter")
    for key, line in (("Issue", issue_line), ("PR", pr_line)):
        if line and not GH_LINK.search(line):
            problems.append(f"`## Entrega` tem `- {key}:` sem link `https://github.com/…` — um terceiro não chega lá sem o histórico do git")
    if issue_line:
        problems += verdict_problems(meta, issue_line, alive, known)
    return problems


def verdict_problems(meta: dict, issue_line: str, alive: set[str], known: set[str] | None) -> list[str]:
    """Read the structured verdict of the `- Issue:` line and judge it."""
    found = VERDICT.findall(issue_line)
    if not found:
        return [f"`## Entrega` não traz o veredito da issue — escreva {VERDICT_HELP}"]
    if len(found) > 1:
        return [
            "`## Entrega` traz "
            + str(len(found))
            + f" vereditos na linha da issue ({', '.join(f'`{a}:{b}`' for a, b in found)}) — deixe um só"
        ]
    verdict, target = found[0]
    if verdict == "fechada":
        if meta.get("pr") and target != f"#{meta['pr']}":
            return [f"`## Entrega` diz `fechada:{target}`, mas o PR do front matter é `#{meta['pr']}`"]
        return []
    # `aberta`: somebody has to answer for the issue, and that somebody has to
    # still be open. When the successor closes, this line goes red again.
    if known is not None and target not in known:
        return [f"`## Entrega` aponta `aberta:{target}`, e esse ticket não existe no quadro"]
    if target == meta["id"]:
        return [f"`## Entrega` aponta `aberta:{target}`, que é o próprio ticket — nomeie outro"]
    if target not in alive:
        return [
            f"`## Entrega` mantém a issue aberta apoiada em `{target}`, que não está mais em aberto"
            " — feche a issue ou aponte um sucessor vivo"
        ]
    return []


def online_closure(rows: list[tuple[dict, str]]) -> tuple[list[str], list[str]]:
    """Reconcile what each ticket claims about its issue with what GitHub says.

    Ligada por padrão: sem isso o gate cobra o registro *ausente* e deixa passar o
    registro *divergente*, que é o sintoma do TCK-0021 (ticket `concluido` com a
    issue aberta). Um erro de `gh` num ticket **não interrompe a fila** — cada
    ticket ganha o seu aviso e os demais continuam sendo conferidos, porque um
    404 no primeiro da lista escondia a divergência do segundo.

    Vermelho só sai de divergência confirmada. Sem `gh`, sem credencial ou sem
    rede: aviso e nenhum problema — nunca falso vermelho.
    """
    problems: list[str] = []
    warnings: list[str] = []
    for meta, body in rows:
        if not GIT_POLICY.get(meta.get("type"), {}).get("pr") or meta.get("status") not in LINKED:
            continue
        if not meta.get("issue"):
            continue
        line = entrega(body).get("issue", "")
        try:
            done = subprocess.run(
                ["gh", "issue", "view", str(meta["issue"]), "--json", "state"],
                capture_output=True, text=True, timeout=30,
            )
        except (OSError, subprocess.SubprocessError) as exc:
            warnings.append(
                f"{meta['id']}: `gh` indisponível ({exc.__class__.__name__}) — issue #{meta['issue']} "
                "conferida só pelo registro local"
            )
            continue
        if done.returncode != 0:
            detail = (done.stderr or "").strip().splitlines()
            warnings.append(
                f"{meta['id']}: `gh issue view {meta['issue']}` saiu {done.returncode} "
                f"({detail[-1] if detail else 'sem detalhe'}) — conferida só pelo registro local"
            )
            continue
        state = json.loads(done.stdout or "{}").get("state", "?").upper()
        verdict = VERDICT.findall(line)
        declared = verdict[0][0] if len(verdict) == 1 else None
        if declared == "fechada" and state != "CLOSED":
            problems.append(f"{meta['id']}: `## Entrega` declara a issue #{meta['issue']} fechada, mas o GitHub diz `{state}`")
        if declared == "aberta" and state == "CLOSED":
            problems.append(f"{meta['id']}: `## Entrega` declara a issue #{meta['issue']} aberta, mas o GitHub diz `{state}`")
    return problems, warnings



def log(path: Path, meta: dict, body: str, entry: str) -> None:
    """Append one line to the append-only `## Histórico` ledger.

    The heading is matched as a whole line, never as a substring: a ticket that
    quotes `## Histórico` inside its prose used to get that prose cut in half.
    The line lands at the end of the ledger section — which is not always the end
    of the file, since a ticket may carry sections after it.
    """
    line = f"- `{today()}` {entry}\n"
    found = LEDGER.search(body)
    if not found:
        save(path, meta, body.rstrip() + "\n\n## Histórico\n\n" + line)
        return
    start = found.end()
    nxt = SECTION.search(body, start)
    end = nxt.start() if nxt else len(body)
    section = body[start:end].rstrip("\n")
    body = body[:start] + section + "\n" + line + ("\n" + body[end:] if nxt else "")
    save(path, meta, body)


# --- commands -------------------------------------------------------------


def cmd_new(args) -> int:
    if args.type not in TYPES:
        raise SystemExit(f"tipo inválido: {args.type} (use {', '.join(TYPES)})")
    areas = [a.strip() for a in (args.areas or "").split(",") if a.strip()]
    unknown = [a for a in areas if a not in AREAS]
    if unknown:
        raise SystemExit(f"área inválida: {', '.join(unknown)}\nválidas: {', '.join(AREAS)}")
    template = TEMPLATES / f"{args.type}.md"
    if not template.exists():
        template = TEMPLATES / "feature.md"
    meta, body = parse(template)
    ticket_id = next_id()
    # The template's own ceilings win when the caller did not ask for one: a spike
    # is deliberately tighter than a feature (2 rounds, 1 challenge).
    meta.update({
        "id": ticket_id,
        "title": args.title,
        "type": args.type,
        "status": "triagem",
        "areas": areas,
        "priority": args.priority if args.priority else meta.get("priority", "p2"),
        "owner": args.owner or "ticket-triage",
        "acceptance": "pendente",
        "rounds": 0,
        "max_rounds": args.max_rounds or int(meta.get("max_rounds") or MAX_ROUNDS),
        "challenges": 0,
        "max_challenges": int(meta.get("max_challenges") or MAX_CHALLENGES),
        "created": today(),
        "updated": today(),
    })
    meta.pop("template", None)
    path = TICKETS / f"{ticket_id}-{slugify(args.title)}.md"
    body = body.replace("{{TITLE}}", args.title).replace("{{ID}}", ticket_id)
    path.write_text(dump(meta, body), encoding="utf-8")
    log(path, *parse(path), f"**ticket-triage** abriu o ticket como `{args.type}`.")
    write_index()
    print(f"{ticket_id}\t{path.relative_to(ROOT)}")
    return 0


def cmd_move(args) -> int:
    path = find(args.id)
    meta, body = parse(path)
    current, target = meta["status"], args.status
    if target not in STATUSES:
        raise SystemExit(f"status inválido: {target} (use {', '.join(STATUSES)})")
    if target not in TRANSITIONS[current]:
        allowed = ", ".join(TRANSITIONS[current]) or "nenhum (estado final)"
        print(f"recusado: {current} → {target} não é transição válida. De `{current}` só cabe: {allowed}", file=sys.stderr)
        return 2
    if target == "concluido" and meta.get("acceptance") != "aprovado":
        print("recusado: `concluido` exige `acceptance: aprovado` — rode `ticket.py accept` antes.", file=sys.stderr)
        return 2
    if current == "contestado" and target == "em-andamento":
        meta["rounds"] = int(meta.get("rounds", 0)) + 1
        if meta["rounds"] >= int(meta.get("max_rounds", MAX_ROUNDS)):
            meta["status"] = "bloqueado"
            log(path, meta, body, (
                f"**guardrail** — rodada {meta['rounds']} de {meta['max_rounds']}: "
                "o loop parou e o ticket foi para `bloqueado`. Decisão humana necessária."
            ))
            write_index()
            print(f"guardrail: {meta['rounds']} rodadas — ticket bloqueado para decisão humana.", file=sys.stderr)
            return 2
    meta["status"] = target
    note = f" — {args.note}" if args.note else ""
    log(path, meta, body, f"**{args.by}** moveu `{current}` → `{target}`{note}")
    write_index()
    print(f"{meta['id']}: {current} → {target}")
    return 0


def cmd_handoff(args) -> int:
    path = find(args.id)
    meta, body = parse(path)
    if args.frm == args.to:
        print(f"recusado: `{args.frm}` não pode passar o ticket para si mesmo.", file=sys.stderr)
        return 2
    if not args.note:
        print("recusado: handoff sem contexto. Use --note para dizer o que o próximo precisa saber.", file=sys.stderr)
        return 2
    meta["owner"] = args.to
    log(path, meta, body, f"**{args.frm}** → **{args.to}**: {args.note}")
    write_index()
    print(f"{meta['id']}: {args.frm} → {args.to}")
    return 0


def cmd_challenge(args) -> int:
    path = find(args.id)
    meta, body = parse(path)
    if args.verdict == "objecao":
        meta["challenges"] = int(meta.get("challenges", 0)) + 1
        limit = int(meta.get("max_challenges", MAX_CHALLENGES))
        if meta["challenges"] > limit:
            log(path, meta, body, (
                f"**guardrail** — {meta['challenges']}ª objeção passou do teto de {limit}. "
                "O contraditório se encerra; a decisão vai ao humano."
            ))
            write_index()
            print(f"guardrail: teto de {limit} objeções ultrapassado — decisão humana.", file=sys.stderr)
            return 2
        moved = _advance(meta, "contestado")
        log(path, meta, body, f"**{args.by}** contestou: {args.note}{moved}")
    else:
        log(path, meta, body, f"**{args.by}** sustentou a decisão: {args.note}")
    write_index()
    print(f"{meta['id']}: contraditório registrado ({args.verdict})"
          + (f" — status agora `{meta['status']}`" if args.verdict == "objecao" else ""))
    return 0


def _advance(meta: dict, target: str) -> str:
    """Move the ticket when the verdict implies it, and say so in the ledger.

    A verdict that only writes a line leaves the board lying about where the work
    is: `accept` used to approve without leaving `revisao`, so `concluido` was
    then refused as an invalid transition. Silent when the move does not apply.
    """
    if target in TRANSITIONS.get(meta["status"], []):
        origin = meta["status"]
        meta["status"] = target
        return f" O ticket foi de `{origin}` para `{target}`."
    return ""


def cmd_accept(args) -> int:
    path = find(args.id)
    meta, body = parse(path)
    if meta.get("acceptance") == "pendente":
        print("recusado: o ticket não tem critério de aceite definido. Volte à triagem.", file=sys.stderr)
        return 2
    meta["acceptance"] = "aprovado"
    note = args.note or "todos os critérios de aceite conferidos e atendidos"
    moved = _advance(meta, "aceite")
    log(path, meta, body, f"**{args.by}** aprovou o aceite: {note}{moved}")
    write_index()
    print(f"{meta['id']}: aceite aprovado — status `{meta['status']}`")
    return 0


def cmd_reject(args) -> int:
    path = find(args.id)
    meta, body = parse(path)
    meta["acceptance"] = "reprovado"
    moved = _advance(meta, "contestado")
    log(path, meta, body, f"**{args.by}** reprovou o aceite: {args.note}{moved}")
    write_index()
    print(f"{meta['id']}: aceite reprovado — status `{meta['status']}`")
    return 0


def cmd_reopen(args) -> int:
    """Undo a premature close.

    `concluido` is a final state in the normal flow, on purpose. It still has to
    be undoable: the ship procedure closes the ticket *after* the commit, and a
    ticket closed before it lands leaves the commit with nowhere to point.
    """
    path = find(args.id)
    meta, body = parse(path)
    if meta["status"] != "concluido":
        print(f"recusado: `reopen` só serve para ticket `concluido`; este está `{meta['status']}`.", file=sys.stderr)
        return 2
    meta["status"] = "aceite"
    log(path, meta, body, f"**{args.by}** reabriu o ticket (`concluido` → `aceite`): {args.note}")
    write_index()
    print(f"{meta['id']}: concluido → aceite")
    return 0


def cmd_git_plan(args) -> int:
    path = find(args.id)
    meta, _ = parse(path)
    policy = GIT_POLICY[meta["type"]]
    slug = path.stem.split("-", 2)[2]
    branch = f"{policy['branch']}/{meta['id'].lower()}-{slug}"
    scope = (meta.get("areas") or ["repo"])[0].split("/")[-1]
    subject = f"{policy['commit']}({scope}): {meta['title'].lower()} ({meta['id']})"
    print(f"ticket:   {meta['id']} ({meta['type']})")
    print(f"issue:    {'obrigatória antes da branch' if policy['issue'] else 'dispensada'}")
    print(f"branch:   {branch}")
    print(f"commit:   {subject}")
    print(f"entrega:  {'pull request para main' if policy['pr'] else 'commit direto na main'}")
    if policy["issue"]:
        labels = ",".join(["ticket"] + (meta.get("areas") or []))
        print()
        print(f"gh issue create --title {json.dumps(meta['title'])} --label {json.dumps(labels)} \\")
        print(f"  --body \"Ticket: {meta['id']} (tickets/{path.name})\"")
        print(f"python3 scripts/tickets/ticket.py set {meta['id']} --issue <N> --branch {branch}")
    print(f"git switch -c {branch}")
    if policy["pr"]:
        issue = meta.get("issue") or "<N>"
        closes = f"Closes #{issue}"
        print(f"gh pr create --fill --base main --body \"{closes}\\n\\nTicket: {meta['id']}\"")
        # One issue, one PR, one ticket: the four issues of TCK-0021 stayed open
        # because nine commits of four tickets rode inside a PR that closed one.
        print("python3 scripts/tickets/watch-pipeline.py watch   # CI verde antes do merge")
        print("gh pr merge <PR> --merge --delete-branch          # merge na main e branch removida")
        print(f"python3 scripts/tickets/ticket.py set {meta['id']} --pr <PR>")
        print(f"# e preencha `## Entrega` de tickets/{path.name}:")
        print(f"#   - Issue: [#{issue}](https://github.com/<dono>/<repo>/issues/{issue}) — `fechada:#<PR>`")
        print(f"#   - Branch: {branch}")
        print("#   - PR: [#<PR>](https://github.com/<dono>/<repo>/pull/<PR>)")
        print("# `make tickets` reprova o ticket que chegar a `aceite` sem esse registro, e")
        print("# reprova também `fechada:` com a issue ainda aberta, quando há credencial.")
    return 0


def cmd_set(args) -> int:
    path = find(args.id)
    meta, body = parse(path)
    changed = []
    for key in ("issue", "pr", "branch", "owner", "priority", "acceptance"):
        value = getattr(args, key, None)
        if value is not None:
            meta[key] = int(value) if key in ("issue", "pr") else value
            changed.append(f"{key}={value}")
    if not changed:
        print("nada a mudar", file=sys.stderr)
        return 2
    log(path, meta, body, f"**cli** atualizou {', '.join(changed)}")
    write_index()
    print(f"{meta['id']}: {', '.join(changed)}")
    return 0


def cmd_list(args) -> int:
    rows = []
    for path in tickets():
        meta, _ = parse(path)
        if args.status and meta["status"] != args.status:
            continue
        if args.type and meta["type"] != args.type:
            continue
        if args.area and args.area not in (meta.get("areas") or []):
            continue
        rows.append(meta)
    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
        return 0
    if not rows:
        print("nenhum ticket")
        return 0
    for meta in rows:
        areas = ",".join(meta.get("areas") or []) or "-"
        print(f"{meta['id']}  {meta['status']:<14} {meta['type']:<14} {meta['priority']}  {meta['title']}  [{areas}]")
    return 0


def cmd_show(args) -> int:
    print(find(args.id).read_text(encoding="utf-8"))
    return 0


def cmd_board(args) -> int:
    columns = {status: [] for status in STATUSES}
    for path in tickets():
        meta, _ = parse(path)
        columns[meta["status"]].append(meta)
    for status in STATUSES:
        items = columns[status]
        if not items and status in SIDE:
            continue
        print(f"\n## {status} ({len(items)})")
        for meta in items:
            flag = ""
            if int(meta.get("rounds", 0)) > 0:
                flag = f"  ⟲{meta['rounds']}/{meta.get('max_rounds', MAX_ROUNDS)}"
            print(f"  {meta['id']}  {meta['title']}  → {meta.get('owner', '-')}{flag}")
    return 0


def write_index() -> None:
    rows = []
    for path in tickets():
        meta, _ = parse(path)
        areas = ", ".join(f"`{a}`" for a in (meta.get("areas") or [])) or "—"
        issue = f"#{meta['issue']}" if meta.get("issue") else "—"
        rows.append(
            f"| [{meta['id']}]({path.name}) | {meta['title']} | `{meta['type']}` | "
            f"`{meta['status']}` | {meta['priority']} | {areas} | {meta.get('owner', '—')} | "
            f"{meta.get('acceptance', '—')} | {issue} |"
        )
    open_count = sum(1 for p in tickets() if parse(p)[0]["status"] not in ("concluido", "cancelado"))
    INDEX.write_text(
        f"{BANNER}\n\n# Tickets\n\n"
        f"Gerado por `python3 scripts/tickets/ticket.py index`. "
        f"{len(rows)} tickets, {open_count} em aberto.\n\n"
        "| ID | Título | Tipo | Status | Prio | Áreas | Dono | Aceite | Issue |\n"
        "|---|---|---|---|---|---|---|---|---|\n" + "\n".join(rows) + "\n",
        encoding="utf-8",
    )


def cmd_index(args) -> int:
    write_index()
    print(f"{INDEX.relative_to(ROOT)} atualizado")
    return 0


def cmd_validate(args) -> int:
    base = Path(getattr(args, "dir", None) or TICKETS).resolve()
    if not base.is_dir():
        print(f"recusado: `{base}` não é um diretório de tickets", file=sys.stderr)
        return 2
    own = base == TICKETS
    problems: list[str] = []
    rows: list[tuple[dict, str]] = []
    for path in tickets(base):
        try:
            meta, body = parse(path)
        except SystemExit as exc:
            problems.append(str(exc))
            continue
        rows.append((meta, body))
    alive = {meta["id"] for meta, _ in rows if meta.get("status") not in ("concluido", "cancelado")}
    known = {meta["id"] for meta, _ in rows}
    for path in tickets(base):
        try:
            meta, body = parse(path)
        except SystemExit:
            continue
        # `--dir` may point outside the repository (a fixture in a scratch dir),
        # and a crash there would look like the gate failing.
        where = path.relative_to(ROOT) if path.is_relative_to(ROOT) else path
        for key in ("id", "title", "type", "status", "priority", "acceptance"):
            if not meta.get(key):
                problems.append(f"{where}: falta `{key}` no front matter")
        if meta.get("type") not in TYPES:
            problems.append(f"{where}: tipo `{meta.get('type')}` fora de {TYPES}")
        if meta.get("status") not in STATUSES:
            problems.append(f"{where}: status `{meta.get('status')}` fora de {STATUSES}")
        if meta.get("priority") not in PRIORITIES:
            problems.append(f"{where}: prioridade `{meta.get('priority')}` fora de {PRIORITIES}")
        if meta.get("acceptance") not in ACCEPTANCE:
            problems.append(f"{where}: aceite `{meta.get('acceptance')}` fora de {ACCEPTANCE}")
        for area in meta.get("areas") or []:
            if area not in AREAS:
                problems.append(f"{where}: área `{area}` não existe na taxonomia")
        if not (meta.get("areas") or []) and meta.get("status") != "triagem":
            problems.append(f"{where}: ticket fora da triagem sem nenhuma área — não dá para rotear")
        if "## Critério de aceite" not in body:
            problems.append(f"{where}: falta a seção `## Critério de aceite`")
        if "## Histórico" not in body:
            problems.append(f"{where}: falta a seção `## Histórico` (ledger de handoff)")
        if meta.get("status") not in ("triagem", "especificacao", "cancelado") and meta.get("acceptance") == "pendente":
            problems.append(f"{where}: saiu da especificação sem critério de aceite definido")
        if meta.get("status") == "concluido" and meta.get("acceptance") != "aprovado":
            problems.append(f"{where}: `concluido` sem aceite aprovado")
        rounds, max_rounds = int(meta.get("rounds", 0)), int(meta.get("max_rounds", MAX_ROUNDS))
        if rounds > max_rounds:
            problems.append(f"{where}: {rounds} rodadas passam do teto {max_rounds} — guardrail furado")
        if rounds >= max_rounds and meta.get("status") not in ("bloqueado", "cancelado", "concluido", "aceite"):
            problems.append(f"{where}: bateu o teto de rodadas e continua em `{meta['status']}` — deveria estar `bloqueado`")
        policy = GIT_POLICY.get(meta.get("type"), {})
        if policy.get("issue") and meta.get("status") in ("revisao", "aceite", "concluido") and not meta.get("issue"):
            problems.append(f"{where}: tipo `{meta['type']}` exige issue no GitHub antes da revisão (`ticket.py set {meta['id']} --issue N`)")
        # The delivery link. A ticket that reached `aceite` without saying which PR
        # closed which issue leaves the GitHub board claiming work that is done.
        for problem in closure_problems(meta, body, alive, known):
            problems.append(f"{where}: {problem}")
    # The index is checked for completeness, not for byte equality. It is generated
    # from the working tree while CI reads what was committed, and more than one
    # session edits `tickets/` at a time: exact comparison would fail on somebody
    # else's in-flight edit, which says nothing about this commit. A ticket missing
    # from the board, or a row pointing at a file that is gone, still fails.
    if not own:
        pass
    elif not INDEX.exists():
        problems.append("tickets/INDEX.md não existe — rode `python3 scripts/tickets/ticket.py index`")
    else:
        listed = set(re.findall(r"^\| \[(TCK-\d{4})\]", INDEX.read_text(encoding="utf-8"), re.MULTILINE))
        present = {parse(path)[0]["id"] for path in tickets()}
        for missing in sorted(present - listed):
            problems.append(f"{missing} não está em tickets/INDEX.md — rode `ticket.py index`")
        for ghost in sorted(listed - present):
            problems.append(f"tickets/INDEX.md lista {ghost}, que não existe — rode `ticket.py index`")
    # Reconciliation with GitHub runs **by default**, and degrades to a warning.
    # `--offline` is for the pre-commit hook, where the network is nobody's
    # promise and the commit must not wait on it.
    if not getattr(args, "offline", False):
        found, warnings = online_closure(rows)
        problems += found
        for warning in warnings:
            print(f"aviso: {warning}")
    if problems:
        for problem in problems:
            print(f"TICKET: {problem}", file=sys.stderr)
        print(f"\n{len(problems)} problema(s) em {base.name}/", file=sys.stderr)
        return 1
    print(f"tickets ok ({len(tickets(base))} arquivos)")
    return 0


SELFTESTS = [
    # (name, body, must contain, must NOT contain)
    (
        "entrada nova fica dentro do ledger, mesmo com seção depois",
        "# T\n\n## Histórico\n\n- `x` velha\n\n## Notas\n\ncorpo\n",
        "- `x` velha\n- ",
        None,
    ),
    (
        "a heading é casada como linha inteira, não como substring",
        "# T\n\n## Escopo\n\nO ledger fica em `## Histórico` do ticket.\n\n"
        "## Histórico\n\n- `x` velha\n",
        "em `## Histórico` do ticket.",
        "## Histórico\n\n` do ticket",
    ),
    (
        "ticket sem ledger ganha um",
        "# T\n\n## Escopo\n\ncorpo\n",
        "## Histórico",
        None,
    ),
]


LINK = "https://github.com/dono/repo"
ENTREGA_OK = (
    "## Entrega\n\n"
    f"- Issue: [#9]({LINK}/issues/9) — `fechada:#8`, entregue com o PR\n"
    "- Branch: fix/tck-9999-exemplo\n"
    f"- PR: [#8]({LINK}/pull/8)\n"
)


def entrega_de(issue: str, branch: str = "fix/x", pr: str | None = None) -> str:
    """Monta uma seção `## Entrega` de teste com a linha da issue variando."""
    pr = pr if pr is not None else f"[#8]({LINK}/pull/8)"
    return f"## Entrega\n\n- Issue: {issue}\n- Branch: {branch}\n- PR: {pr}\n"


# (name, front matter overrides, `## Entrega` section, expected fragment or None)
# These guard the delivery-link rule itself, not the CLI around it: each case is a
# ticket that used to pass the gate and should not, or the other way round.
LINK_TESTS = [
    (
        "bug entregue sem registrar o PR reprova",
        {"type": "bug", "status": "concluido", "issue": 9},
        "## Entrega\n\n- Issue: \n- Branch: \n- PR: \n",
        "sem `pr:` no front matter",
    ),
    (
        "issue fechada, com link e PR, passa",
        {"type": "bug", "status": "concluido", "issue": 9, "pr": 8},
        ENTREGA_OK,
        None,
    ),
    (
        "issue aberta com ticket sucessor vivo passa",
        {"type": "feature", "status": "aceite", "issue": 9, "pr": 8},
        entrega_de(f"[#9]({LINK}/issues/9) — `aberta:TCK-9000`, à espera de evidência"),
        None,
    ),
    (
        "issue aberta apoiada em sucessor já fechado reprova",
        {"type": "feature", "status": "concluido", "issue": 9, "pr": 8},
        entrega_de(f"[#9]({LINK}/issues/9) — `aberta:TCK-9001`"),
        "não está mais em aberto",
    ),
    (
        "issue sem veredito nenhum reprova",
        {"type": "bug", "status": "concluido", "issue": 9, "pr": 8},
        entrega_de(f"[#9]({LINK}/issues/9)"),
        "não traz o veredito da issue",
    ),
    (
        "prosa `segue aberta, sera fechada depois` não é veredito e não dispensa sucessor",
        {"type": "bug", "status": "concluido", "issue": 9, "pr": 8},
        entrega_de(f"[#9]({LINK}/issues/9) — segue aberta, sera fechada depois"),
        "não traz o veredito da issue",
    ),
    (
        "prosa que só menciona uma porta fechada não fecha issue nenhuma",
        {"type": "bug", "status": "concluido", "issue": 9, "pr": 8},
        entrega_de(f"[#9]({LINK}/issues/9) — anotado com a porta fechada do escritorio"),
        "não traz o veredito da issue",
    ),
    (
        "veredito `fechada:` apontando outro PR que não o do front matter reprova",
        {"type": "bug", "status": "concluido", "issue": 9, "pr": 8},
        entrega_de(f"[#9]({LINK}/issues/9) — `fechada:#7`"),
        "o PR do front matter é `#8`",
    ),
    (
        "dois vereditos na mesma linha reprova: não se sabe qual vale",
        {"type": "bug", "status": "concluido", "issue": 9, "pr": 8},
        entrega_de(f"[#9]({LINK}/issues/9) — `aberta:TCK-9000` e depois `fechada:#8`"),
        "deixe um só",
    ),
    (
        "sucessor que não existe no quadro reprova",
        {"type": "bug", "status": "concluido", "issue": 9, "pr": 8},
        entrega_de(f"[#9]({LINK}/issues/9) — `aberta:TCK-8888`"),
        "não existe no quadro",
    ),
    (
        "o próprio ticket não pode ser o seu sucessor",
        {"type": "bug", "status": "concluido", "issue": 9, "pr": 8},
        entrega_de(f"[#9]({LINK}/issues/9) — `aberta:TCK-9999`"),
        "é o próprio ticket",
    ),
    (
        "PR sem link não leva um terceiro a lugar nenhum",
        {"type": "bug", "status": "concluido", "issue": 9, "pr": 8},
        entrega_de(f"[#9]({LINK}/issues/9) — `fechada:#8`", pr="#8"),
        "sem link `https://github.com/…`",
    ),
    (
        "prosa que só fala de PR fora do `## Entrega` não conta como registro",
        {"type": "bug", "status": "concluido", "issue": 9, "pr": 8},
        f"## Notas\n\n- PR: [#8]({LINK}/pull/8) fechou a issue #9\n",
        "sem a seção `## Entrega`",
    ),
    (
        "tipo que entrega direto na main não é cobrado do elo",
        {"type": "chore", "status": "concluido"},
        "## Entrega\n\n- Issue: \n- Branch: \n- PR: \n",
        None,
    ),
]


def cmd_selftest(args) -> int:
    """Guard the two ways `log` used to corrupt a ticket, plus the challenge move.

    The project has no Python test runner, so the checks live here and run from
    `make tickets`. A ledger that eats the ticket's prose is worse than no ledger.
    """
    import tempfile

    failures = []
    head = "---\nid: TCK-9999\ntitle: t\ntype: chore\nstatus: revisao\npriority: p2\nacceptance: definido\n---\n"
    tmp = Path(tempfile.mkdtemp()) / "TCK-9999-selftest.md"
    for name, body, must, must_not in SELFTESTS:
        tmp.write_text(head + body, encoding="utf-8")
        log(tmp, *parse(tmp), "entrada de teste")
        written = tmp.read_text(encoding="utf-8")
        if must not in written:
            failures.append(f"{name}: esperava encontrar {must!r}")
        if must_not and must_not in written:
            failures.append(f"{name}: não devia conter {must_not!r}")
    # A verdict has to move the ticket, not just write a line about it.
    for target, expected in (("contestado", "contestado"), ("aceite", "aceite")):
        probe = {"status": "revisao"}
        _advance(probe, target)
        if probe["status"] != expected:
            failures.append(f"veredito para `{target}` a partir de `revisao` não moveu o ticket")
    probe = {"status": "concluido"}
    _advance(probe, "aceite")
    if probe["status"] != "concluido":
        failures.append("`_advance` moveu um ticket por transição inválida")
    # The delivery link: issue ↔ PR ↔ ticket. TCK-9000 is open, TCK-9001 is not.
    alive, known = {"TCK-9000"}, {"TCK-9000", "TCK-9001", "TCK-9999"}
    for name, over, section, expected in LINK_TESTS:
        meta = {"id": "TCK-9999", "type": "chore", "status": "concluido"} | over
        found = closure_problems(meta, "# T\n\n" + section + "\n## Histórico\n", alive, known)
        if expected and not any(expected in problem for problem in found):
            failures.append(f"elo — {name}: esperava um achado com {expected!r}, veio {found}")
        if not expected and found:
            failures.append(f"elo — {name}: esperava passar, veio {found}")
    # The same rule against the fixtures on disk, so `make tickets` exercises the
    # gate end to end and not only the function behind it.
    for folder, expect_red in (("elo-vermelho", True), ("elo-verde", False)):
        base = FIXTURES / folder
        rows = [parse(path) for path in tickets(base)]
        if not rows:
            failures.append(f"fixture {folder}: nenhum ticket em {base.relative_to(ROOT)}")
            continue
        open_ids = {m["id"] for m, _ in rows if m.get("status") not in ("concluido", "cancelado")}
        all_ids = {m["id"] for m, _ in rows}
        found = [(m["id"], closure_problems(m, b, open_ids, all_ids)) for m, b in rows]
        red = [tid for tid, problems in found if problems]
        if expect_red and not red:
            failures.append(f"fixture {folder}: o gate deixou passar o ticket sem elo issue-PR-ticket")
        if not expect_red and red:
            failures.append(f"fixture {folder}: o gate reprovou {', '.join(red)}, que registra o elo")
    for failure in failures:
        print(f"SELFTEST: {failure}", file=sys.stderr)
    if failures:
        print(f"\n{len(failures)} falha(s) no autoteste do ledger", file=sys.stderr)
        return 1
    print(f"autoteste ok ({len(SELFTESTS) + 3 + len(LINK_TESTS) + 2} casos)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="ticket.py", description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("new"); p.set_defaults(func=cmd_new)
    p.add_argument("--type", required=True, choices=TYPES)
    p.add_argument("--title", required=True)
    p.add_argument("--areas", default="")
    p.add_argument("--priority", choices=PRIORITIES)
    p.add_argument("--owner")
    p.add_argument("--max-rounds", type=int, dest="max_rounds")

    p = sub.add_parser("list"); p.set_defaults(func=cmd_list)
    p.add_argument("--status", choices=STATUSES); p.add_argument("--area", choices=AREAS)
    p.add_argument("--type", choices=TYPES); p.add_argument("--json", action="store_true")

    p = sub.add_parser("show"); p.set_defaults(func=cmd_show); p.add_argument("id")
    p = sub.add_parser("board"); p.set_defaults(func=cmd_board)
    p = sub.add_parser("index"); p.set_defaults(func=cmd_index)
    p = sub.add_parser("validate"); p.set_defaults(func=cmd_validate)
    p.add_argument("--strict", action="store_true")
    p.add_argument("--dir", help="valida outro diretório de tickets (fixtures do gate)")
    p.add_argument("--online", action="store_true", help="(padrão) confere no GitHub o que o ticket declara da issue; sem `gh` avisa e sai 0")
    p.add_argument("--offline", action="store_true", help="não toca a rede: confere só o registro local (usado no pre-commit)")
    p = sub.add_parser("selftest"); p.set_defaults(func=cmd_selftest)

    p = sub.add_parser("move"); p.set_defaults(func=cmd_move)
    p.add_argument("id"); p.add_argument("status", choices=STATUSES)
    p.add_argument("--by", required=True); p.add_argument("--note")

    p = sub.add_parser("handoff"); p.set_defaults(func=cmd_handoff)
    p.add_argument("id"); p.add_argument("--from", dest="frm", required=True)
    p.add_argument("--to", required=True); p.add_argument("--note")

    p = sub.add_parser("challenge"); p.set_defaults(func=cmd_challenge)
    p.add_argument("id"); p.add_argument("--by", required=True)
    p.add_argument("--verdict", required=True, choices=["ok", "objecao"])
    p.add_argument("--note", required=True)

    p = sub.add_parser("accept"); p.set_defaults(func=cmd_accept)
    p.add_argument("id"); p.add_argument("--by", required=True); p.add_argument("--note")

    p = sub.add_parser("reject"); p.set_defaults(func=cmd_reject)
    p.add_argument("id"); p.add_argument("--by", required=True); p.add_argument("--note", required=True)

    p = sub.add_parser("reopen"); p.set_defaults(func=cmd_reopen)
    p.add_argument("id"); p.add_argument("--by", required=True); p.add_argument("--note", required=True)

    p = sub.add_parser("git-plan"); p.set_defaults(func=cmd_git_plan); p.add_argument("id")

    p = sub.add_parser("set"); p.set_defaults(func=cmd_set)
    p.add_argument("id"); p.add_argument("--issue"); p.add_argument("--pr"); p.add_argument("--branch")
    p.add_argument("--owner"); p.add_argument("--priority", choices=PRIORITIES)
    p.add_argument("--acceptance", choices=ACCEPTANCE)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
