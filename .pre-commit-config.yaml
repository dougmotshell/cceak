# CI-04. Install once per clone: `pre-commit install`.
# The local hooks call Makefile targets, so this file stays stack-neutral.
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: check-added-large-files
      - id: check-merge-conflict
      - id: detect-private-key      # HYG-06: a key never reaches a commit
      - id: end-of-file-fixer
      - id: trailing-whitespace
      - id: check-json
      - id: check-yaml

  - repo: local
    hooks:
      - id: ai-surfaces
        name: ai surfaces in sync
        entry: python3 scripts/sync-ai-surfaces.py --check
        language: system
        pass_filenames: false
        files: '^(skills/|\.claude/(agents|rules)/|scripts/sync-ai-surfaces\.py)'

      # TODO: enable these once the Makefile sensors are filled in.
      # - id: lint
      #   name: lint
      #   entry: make lint
      #   language: system
      #   pass_filenames: false
      # - id: typecheck
      #   name: typecheck
      #   entry: make typecheck
      #   language: system
      #   pass_filenames: false
