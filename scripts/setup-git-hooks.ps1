# scripts/setup-git-hooks.ps1
# Setup Git hooks for Windows (PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-git-hooks.ps1

$ErrorActionPreference = "Stop"

# Colors
$Blue = "Cyan"
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Blue
Write-Host "🔧 Setting Up Git Hooks (Windows PowerShell)" -ForegroundColor $Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Blue

# Check if Git is available
try {
    git --version | Out-Null
}
catch {
    Write-Host "❌ ERROR: Git is not installed or not on PATH" -ForegroundColor $Red
    Write-Host "Please install Git for Windows: https://git-scm.com/download/win" -ForegroundColor $Yellow
    exit 1
}

# Get repo root
$repoRoot = git rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Not in a Git repository" -ForegroundColor $Red
    exit 1
}

Set-Location $repoRoot

# Step 1: Configure Git to use .githooks
Write-Host "[1/3]" -ForegroundColor $Yellow -NoNewline
Write-Host " Configuring Git to use .githooks directory..." -ForegroundColor White
git config core.hooksPath .githooks
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ core.hooksPath set to: .githooks" -ForegroundColor $Green
}
else {
    Write-Host "❌ ERROR: Failed to configure core.hooksPath" -ForegroundColor $Red
    exit 1
}

# Step 2: Verify .githooks directory exists
Write-Host "[2/3]" -ForegroundColor $Yellow -NoNewline
Write-Host " Verifying .githooks directory..." -ForegroundColor White
if (Test-Path ".githooks/pre-push") {
    Write-Host "✓ .githooks/pre-push exists" -ForegroundColor $Green
}
else {
    Write-Host "⚠ WARNING: .githooks/pre-push not found" -ForegroundColor $Yellow
}

# Step 3: Verify setup
Write-Host "[3/3]" -ForegroundColor $Yellow -NoNewline
Write-Host " Verifying setup..." -ForegroundColor White
$hooksPath = git config core.hooksPath
if ($hooksPath -eq ".githooks") {
    Write-Host "✓ Git hooks path verified: $hooksPath" -ForegroundColor $Green
}
else {
    Write-Host "⚠ WARNING: Unexpected hooks path: $hooksPath" -ForegroundColor $Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Green
Write-Host "✅ Git Hooks Setup Complete!" -ForegroundColor $Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Verify setup: git config core.hooksPath" -ForegroundColor White
Write-Host "  2. Make a commit and try: git push" -ForegroundColor White
Write-Host "  3. The pre-push hook will automatically run lint, typecheck, and build" -ForegroundColor White
Write-Host ""
