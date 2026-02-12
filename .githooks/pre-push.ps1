#!/usr/bin/env pwsh
# .githooks/pre-push.ps1
# Windows PowerShell wrapper for the pre-push verification pipeline

try {
  $repoRoot = git rev-parse --show-toplevel 2>$null
  if ($LASTEXITCODE -ne 0) { exit 0 }
  Set-Location $repoRoot
} catch {
}

Write-Host "Running pre-push checks (PowerShell)..." -ForegroundColor Cyan

$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) {
  Write-Host "pnpm not found on PATH. Please install pnpm: https://pnpm.io/installation" -ForegroundColor Red
  exit 1
}

# Remove previous Next.js build output first for a fresh build
if (Test-Path ".next") {
  Remove-Item -Recurse -Force ".next"
  Write-Host "✓ Removed existing .next directory" -ForegroundColor Green
} else {
  Write-Host "✓ No existing .next directory to remove" -ForegroundColor Green
}

& pnpm run lint
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ LINT FAILED - Push Blocked" -ForegroundColor Red
  exit $LASTEXITCODE
}

& pnpm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ BUILD FAILED - Push Blocked" -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "✅ All Checks Passed - Push Allowed" -ForegroundColor Green
exit 0
