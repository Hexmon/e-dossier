#!/usr/bin/env pwsh
# .githooks/pre-push.ps1
# Windows PowerShell wrapper for the pre-push verification pipeline

try {
  $repoRoot = git rev-parse --show-toplevel 2>$null
  if ($LASTEXITCODE -ne 0) { exit 0 }
  Set-Location $repoRoot
} catch {
}

Write-Host "Running pre-push verify (PowerShell)..." -ForegroundColor Cyan

$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) {
  Write-Host "pnpm not found on PATH. Please install pnpm: https://pnpm.io/installation" -ForegroundColor Red
  exit 1
}

# Run the same verify pipeline used by the bash hook
& pnpm run verify
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ VERIFICATION FAILED - Push Blocked" -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "✅ All Checks Passed - Push Allowed" -ForegroundColor Green
exit 0
