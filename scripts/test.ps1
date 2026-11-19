# Run backend + frontend unit/integration suites (single command).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not $Root) { $Root = Resolve-Path (Join-Path $PSScriptRoot "..") }

Write-Host "== backend (pytest) =="
Push-Location (Join-Path $Root "backend")
try {
  $py = Join-Path ".venv" "Scripts\python.exe"
  if (Test-Path $py) {
    & $py -m pytest -q -k "not test_postgres_upgrade_and_downgrade"
  } else {
    python -m pytest -q -k "not test_postgres_upgrade_and_downgrade"
  }
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

Write-Host "== frontend (vitest) =="
Push-Location (Join-Path $Root "frontend")
try {
  npm test
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

Write-Host "All local unit/integration suites passed."
