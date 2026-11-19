#!/usr/bin/env bash
# Run backend + frontend unit/integration suites (single command for CI-parity local runs).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== backend (pytest) =="
(
  cd "$ROOT/backend"
  if [[ -x .venv/bin/python ]]; then
    .venv/bin/python -m pytest -q -k "not test_postgres_upgrade_and_downgrade"
  else
    python -m pytest -q -k "not test_postgres_upgrade_and_downgrade"
  fi
)

echo "== frontend (vitest) =="
(
  cd "$ROOT/frontend"
  npm test
)

echo "All local unit/integration suites passed."
