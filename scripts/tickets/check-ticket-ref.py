#!/usr/bin/env python3
"""Ticket gate for commits.

Every commit in this project belongs to a ticket, and the delivery flow depends
on the ticket's type: `bug` and `feature` go through a GitHub issue, a dedicated
branch and a pull request; `docs`, `chore`, `external-setup` and `research`
may land directly on `main`.

Two stages, one script:

    check-ticket-ref.py --commit-msg <file>   subject carries a valid `(TCK-NNNN)`
    check-ticket-ref.py --branch              branch matches the ticket policy

Both run from pre-commit. Set `TICKET_GATE=off` to bypass on a throwaway clone;
that is a deliberate escape hatch, not the normal path.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "tickets"))

import importlib.util

spec = importlib.util.spec_from_file_location("ticket", ROOT / "scripts" / "tickets" / "ticket.py")
ticket = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ticket)

SUBJECT = re.compile(r"^(?P<type>feat|fix|docs|refactor|test|chore|build|ci|perf|style)(\([^)]+\))?!?: .+ \((?P<id>TCK-\d{4})\)$")
EXEMPT = re.compile(r"^(Merge |Revert |fixup! |squash! )")


def fail(*lines: str) -> int:
    for line in lines:
        print(f"TICKET-GATE: {line}", file=sys.stderr)
    return 1


def load(ticket_id: str):
    try:
        path = ticket.find(ticket_id)
    except SystemExit:
        return None, None
    return path, ticket.parse(path)[0]


def check_commit_msg(path: Path) -> int:
    subject = path.read_text(encoding="utf-8").splitlines()[0].strip()
    if not subject or subject.startswith("#") or EXEMPT.match(subject):
        return 0
    match = SUBJECT.match(subject)
    if not match:
        return fail(
            f"mensagem fora do contrato: {subject!r}",
            "esperado: `<tipo>(<escopo>): <o que muda> (TCK-NNNN)`",
            "exemplo:  feat(dados): somar dívidas por taxa efetiva (TCK-0007)",
            "descubra o id com `python3 scripts/tickets/ticket.py board`.",
        )
    ticket_id = match.group("id")
    _, meta = load(ticket_id)
    if meta is None:
        return fail(f"{ticket_id} não existe em tickets/ — abra com `ticket.py new` antes de commitar.")
    if meta["status"] in ("concluido", "cancelado"):
        return fail(f"{ticket_id} está `{meta['status']}`: um ticket fechado não recebe commit novo.")
    # A ticket legitimately spans several commit types: a feature carries its
    # tests, its docs and the generated surfaces (`chore`). What the gate guards
    # is the one mismatch that hides scope: new capability entering as a fix, or
    # a documentation-only ticket growing application code.
    kind = match.group("type")
    if meta["type"] == "bug" and kind == "feat":
        return fail(
            f"{ticket_id} é `bug`: `feat:` esconde escopo novo dentro de uma correção.",
            "Use `fix:` (ou `test:`/`docs:`/`chore:` de apoio). Capacidade nova pede ticket `feature` próprio.",
        )
    if meta["type"] in ("docs", "external-setup", "research") and kind in ("feat", "fix"):
        return fail(
            f"{ticket_id} é `{meta['type']}`: `{kind}:` é mudança de comportamento num ticket de documentação.",
            "Abra um ticket `feature` ou `bug` para o código e deixe este com `docs:`/`chore:`.",
        )
    return 0


def current_branch() -> str:
    out = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True, cwd=ROOT)
    return out.stdout.strip()


def check_branch() -> int:
    branch = current_branch()
    match = re.match(r"^(feat|fix|spike|docs|chore)/(tck-\d{4})-", branch)
    if match:
        _, meta = load(match.group(2).upper())
        if meta is None:
            return fail(f"a branch cita {match.group(2).upper()}, que não existe em tickets/.")
        policy = ticket.GIT_POLICY[meta["type"]]
        if match.group(1) != policy["branch"]:
            return fail(f"{meta['id']} é `{meta['type']}`: o prefixo da branch devia ser `{policy['branch']}/`, não `{match.group(1)}/`.")
        if policy["issue"] and not meta.get("issue"):
            return fail(
                f"{meta['id']} é `{meta['type']}` e ainda não tem issue no GitHub.",
                "crie a issue e registre: `python3 scripts/tickets/ticket.py set "
                f"{meta['id']} --issue <N>` (veja `ticket.py git-plan {meta['id']}`).",
            )
        return 0
    if branch != "main":
        return fail(
            f"a branch `{branch}` não segue o padrão `<tipo>/tck-NNNN-<slug>`.",
            "rode `python3 scripts/tickets/ticket.py git-plan <ID>` para o nome correto.",
        )
    staged = subprocess.run(["git", "diff", "--cached", "--name-only"], capture_output=True, text=True, cwd=ROOT).stdout.split()
    if not staged:
        return 0
    open_tickets = []
    for path in ticket.tickets():
        meta = ticket.parse(path)[0]
        if meta["status"] in ("em-andamento", "revisao", "contestado", "aceite"):
            open_tickets.append(meta)
    needs_pr = [m for m in open_tickets if ticket.GIT_POLICY[m["type"]]["pr"]]
    if needs_pr:
        ids = ", ".join(f"{m['id']} ({m['type']})" for m in needs_pr)
        return fail(
            f"commit direto na `main` com ticket que exige pull request: {ids}.",
            "`bug` e `feature` vão por issue + branch + PR. Rode:",
            f"  python3 scripts/tickets/ticket.py git-plan {needs_pr[0]['id']}",
            "Tickets de `docs`, `chore`, `external-setup` e `research` podem ir direto na `main`.",
        )
    return 0


def main() -> int:
    if os.environ.get("TICKET_GATE") == "off":
        return 0
    if not ticket.tickets():
        return 0
    args = sys.argv[1:]
    if args and args[0] == "--commit-msg":
        return check_commit_msg(Path(args[1]))
    if args and args[0] == "--branch":
        return check_branch()
    print("uso: check-ticket-ref.py --commit-msg <arquivo> | --branch", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
