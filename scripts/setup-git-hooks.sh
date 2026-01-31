#!/usr/bin/env bash
# setup-git-hooks.sh
# Configure repository to use the local .githooks directory and make hooks executable

set -euo pipefail

git rev-parse --show-toplevel >/dev/null 2>&1 || { echo "Not a git repository" >&2; exit 1; }

git config core.hooksPath .githooks
chmod +x .githooks/pre-push .githooks/post-checkout || true

echo "Configured core.hooksPath to .githooks and made hooks executable." 
#!/usr/bin/env bash
# scripts/setup-git-hooks.sh
# Setup Git hooks for macOS and Linux
# Usage: bash scripts/setup-git-hooks.sh

set -euo pipefail

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Setting Up Git Hooks (macOS/Linux)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Ensure we're in the repo root
REPO_ROOT="$(git rev-parse --show-toplevel)" || exit 1
cd "$REPO_ROOT" || exit 1

# Step 1: Configure Git to use .githooks
echo -e "${YELLOW}[1/3]${NC} Configuring Git to use .githooks directory..."
git config core.hooksPath .githooks
echo -e "${GREEN}✓${NC} core.hooksPath set to: .githooks"

# Step 2: Make pre-push hook executable
echo -e "${YELLOW}[2/3]${NC} Making hooks executable..."
chmod +x .githooks/pre-push
echo -e "${GREEN}✓${NC} .githooks/pre-push is now executable"

# Step 3: Verify setup
echo -e "${YELLOW}[3/3]${NC} Verifying setup..."
HOOKS_PATH=$(git config core.hooksPath)
if [ "$HOOKS_PATH" = ".githooks" ]; then
  echo -e "${GREEN}✓${NC} Git hooks path verified: $HOOKS_PATH"
else
  echo -e "${YELLOW}⚠ Warning: Unexpected hooks path: $HOOKS_PATH${NC}"
fi

if [ -x .githooks/pre-push ]; then
  echo -e "${GREEN}✓${NC} .githooks/pre-push is executable"
else
  echo -e "${YELLOW}⚠ Warning: .githooks/pre-push is not executable${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Git Hooks Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify setup: git config core.hooksPath"
echo "  2. Make a commit and try: git push"
echo "  3. The pre-push hook will automatically run lint, typecheck, and build"
echo ""
