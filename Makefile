# harness-bootstrap >>>
# Neutral sensor interface. CI, pre-commit and the PostToolUse hook all call these
# targets, so nothing downstream knows your stack. Fill the TODO commands once and
# every consumer starts working.
#
# A TODO target FAILS on purpose — a sensor that silently succeeds is worse than no
# sensor. See templates/harness/README.md for the per-stack recipe.

.DEFAULT_GOAL := help
.PHONY: help test lint typecheck format lint-file format-file sync sync-check harness harness-gate harness-report

TODO = @printf 'TODO: fill the `%s` target in the Makefile.\n' $@ && exit 1

help:  ## List the targets
	@grep -E '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

test:  ## SNS-01/05 — run the test suite (pytest, vitest, go test, cargo test)
	$(TODO)

lint:  ## SNS-02 — run the linter over the whole tree (ruff, eslint, golangci-lint)
	$(TODO)

typecheck:  ## SNS-03 — type check (mypy --strict, tsc --noEmit, or a typed language)
	$(TODO)

format:  ## SNS-04 — format the whole tree (ruff format, prettier, gofmt, rustfmt)
	$(TODO)

# --- one file at a time: called by the PostToolUse hook, so keep these fast ---

lint-file:  ## Lint just $(FILE)
	$(TODO)

format-file:  ## Format just $(FILE) in place
	$(TODO)

# --- AI surfaces -----------------------------------------------------------

sync:  ## Regenerate the AI surfaces from their authored sources
	python3 scripts/sync-ai-surfaces.py

sync-check:  ## Fail if a generated surface drifted from its source
	python3 scripts/sync-ai-surfaces.py --check

harness:  ## Score the harness (36 checks, 108 points, levels L0-L4)
	npx -y harness-score

harness-gate:  ## The same scan as a gate — fails below MIN_LEVEL (default 3)
	npx -y harness-score --min-level $(or $(MIN_LEVEL),3)

harness-report:  ## Write the scan as markdown and as JSON, for a PR or a baseline
	npx -y harness-score --md harness-report.md --json > harness-report.json
# harness-bootstrap <<<
