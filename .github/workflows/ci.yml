# CI-01..03 plus the drift gate. Every job calls a Makefile target, so this file
# never learns your stack.
name: ci

on:
  push:
    branches: ["**"]
  pull_request:

permissions:
  contents: read

jobs:
  surfaces:
    # The generator is the only hard gate from day one: it needs no project code,
    # so it can never be legitimately red.
    name: ai surfaces in sync
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: make sync-check

  sensors:
    name: test / lint / typecheck
    runs-on: ubuntu-latest
    # TODO: remove `continue-on-error` once the Makefile sensors are filled in.
    # Until then this job reports without blocking, instead of being deleted and
    # forgotten.
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      # TODO: add the setup step for your stack (setup-node, setup-python, setup-go).
      - name: test
        run: make test
      - name: lint
        run: make lint
      - name: typecheck
        run: make typecheck

  harness:
    name: harness score
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      # Report mode. To gate, set HARNESS_MIN_LEVEL as a repository variable:
      # 3 once the sensors are real, 4 once the gate hooks are in place.
      # Exit codes: 0 pass, 1 gate failure, 2 error.
      - name: score
        env:
          MIN_LEVEL: ${{ vars.HARNESS_MIN_LEVEL }}
        run: |
          npx -y harness-score --md harness-report.md \
            ${MIN_LEVEL:+--min-level "$MIN_LEVEL"}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: harness-report
          path: harness-report.md
