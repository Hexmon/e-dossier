# Contributing to e-dossier

## Code Quality & Push Policy

This repository enforces an **enterprise-grade, cross-platform** quality gate on **EVERY `git push` to ANY branch**. The verification pipeline runs locally (as a Git hook) and remotely (in CI), ensuring consistent code quality.

### Quick Start

**That's it! No setup needed.** Hooks auto-configure on clone/pull or first push.

Just clone and push:
```bash
git clone https://github.com/your-org/e-dossier.git
cd e-dossier
pnpm install        # Install dependencies
git checkout -b feature/my-feature
# Make changes...
git push origin feature/my-feature  # Hook auto-configures on first push
```

**After pulling master or merging master into your branch:**
```bash
git pull origin master
# or
git merge master
# → post-checkout hook runs automatically
# → Git hooks path is configured

git checkout -b new-feature
git push origin new-feature  # ✅ Hooks work - all checks enforced
```

Hooks automatically:
- Configure themselves after clone (`post-checkout` hook)
- Configure themselves after pull/merge (`post-checkout` hook)
- Configure themselves before first push (`pre-push` hook)
- Run lint, typecheck, and build verification on every push to any branch

No manual setup script needed unless you're troubleshooting!

---

## Pre-Push Hook (Local Enforcement)

Git hooks are committed in `.githooks/` and automatically configured via `core.hooksPath` after running the setup script.

### How It Works

When you run `git push`:

1. **Preflight Checks:**
   - ✓ Verify `pnpm-lock.yaml` exists (dependencies locked)
   - ✓ Verify `pnpm` is on PATH (package manager available)
   - ✓ Verify Node.js ≥ 20 (correct runtime version)
   - ✓ Verify pnpm ≥ 9 (correct package manager version)

2. **Verification Pipeline:**
   - Runs `pnpm run verify` (which chains: lint → typecheck → build)
   - Outputs progress with colors and emojis
   - Shows full error output if any step fails

3. **Result:**
   - ✅ All pass → push proceeds
   - ❌ Any fail → push is blocked; detailed errors shown in terminal

### What Gets Verified

#### Lint (`pnpm run lint`)
Checks code style, formatting, and quality using ESLint.

**Example failure:**
```
✓ pnpm-lock.yaml exists
✓ pnpm is available
✓ Node.js version 20.11.1 (required: >=20)
✓ pnpm version 9.0.0 (required: >=9)

[Running Verification Pipeline]
❌ VERIFICATION FAILED - Push Blocked

Fix the errors above and try again:
  • Lint errors: pnpm run lint
  • Type errors: pnpm run typecheck
  • Build errors: pnpm run build
```

**To fix:**
```bash
pnpm run lint
# Fix issues shown
git add .
git commit -m "fix: lint errors"
git push  # Hook re-runs automatically
```

#### Type Check (`pnpm run typecheck`)
Validates TypeScript type safety via `tsc --noEmit`.

**To fix:**
```bash
pnpm run typecheck
# Review type errors
# Update code to match types
git add .
git commit -m "fix: type errors"
git push
```

#### Build (`pnpm run build`)
Ensures the app builds successfully for production.

**To fix:**
```bash
pnpm run build
# Debug build errors
git add .
git commit -m "fix: build errors"
git push
```

---

## Setup Instructions

### Prerequisites

- **Node.js**: ≥ 20 (check with `node -v`)
- **pnpm**: ≥ 9 (check with `pnpm -v`)
- **Git**: ≥ 2.9 (for `core.hooksPath` support)

If you don't have these, install them:

**Node.js:**
- macOS/Linux: Use [nvm](https://github.com/nvm-sh/nvm) or [homebrew](https://brew.sh)
- Windows: Download from [nodejs.org](https://nodejs.org)

**pnpm:**
```bash
npm install -g pnpm@latest
```

### Automatic Setup (On Clone & First Push)

The Git hooks **auto-configure automatically**. No manual setup needed!

**On clone:**
```bash
git clone https://github.com/your-org/e-dossier.git
# post-checkout hook runs silently and configures core.hooksPath
# .githooks directory is present with all hooks
```

**On any Git operation (pull, merge, checkout):**
```bash
git pull origin master
git merge master
git checkout feature/some-branch
# → post-checkout hook runs automatically
# → Ensures core.hooksPath is set to .githooks
```

**Important:** The hooks work on **ALL terminals and ALL platforms**:
- ✅ **Windows:** PowerShell, CMD, Git Bash
- ✅ **macOS/Linux:** Bash, Zsh, Fish, etc.
- ✅ **Any branch:** Not just master

The hooks are **shell-agnostic** — Git runs them directly, regardless of your terminal.


**On first push:**
```bash
git push origin feature/my-feature
# pre-push hook runs and auto-configures if needed
# Then runs: lint → typecheck → build
```

### Manual Setup (Optional, For Troubleshooting)

If you need to manually configure hooks, setup scripts are available:

#### macOS / Linux (Bash/Zsh)
```bash
bash scripts/setup-git-hooks.sh
```

#### Windows (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-git-hooks.ps1
```

### Verify Setup

After any clone, pull, or merge, confirm hooks are configured:

```bash
# Should output: .githooks
git config core.hooksPath

# Should be executable (if on macOS/Linux)
ls -la .githooks/pre-push
# Should see: -rwxr-xr-x (executable)

# Try a test push (create a dummy branch first)
git checkout -b test-hook
git push origin test-hook
# You should see the hook run with colored output
```

**Windows (PowerShell) verification:**
```powershell
git config core.hooksPath
# Should output: .githooks

dir .\.githooks\
# Should show: pre-push, post-checkout, .gitkeep

git checkout -b test-hook
git push origin test-hook
# PowerShell shows colored hook output
```

If `git config core.hooksPath` is empty after clone/pull, the `post-checkout` hook may not have run. Run manual setup (see below).


---

## Verification Checklist

After you run your first `git push`, verify everything worked:

- [ ] `git config core.hooksPath` outputs `.githooks` (auto-configured)
- [ ] `pnpm run verify` runs without errors
- [ ] `git push` to any branch triggers the pre-push hook with colored output
- [ ] Hook output shows colored headings and ✓ preflight checks
- [ ] Intentionally break lint, re-push, and confirm push is blocked
- [ ] Fix lint, push again, and confirm push proceeds

---

## Advanced Usage

### Manual Verification

To run the verification pipeline manually (useful for CI integration):

```bash
pnpm run verify
```

This chains all checks: lint → typecheck → build

### Individual Checks

```bash
pnpm run lint       # ESLint only
pnpm run typecheck  # TypeScript type checking only
pnpm run build      # Production build only
```

### Bypass Hook (Not Recommended)

If you absolutely must skip the hook (e.g., emergency hotfix):

```bash
git push --no-verify
```

⚠️ **Warning:** This skips local verification but **CI will still run** on GitHub. Pushes that fail CI cannot be merged.

### Troubleshooting

#### Hook Not Running

1. **Verify auto-setup worked:**
   ```bash
   git config core.hooksPath
   # Should output: .githooks
   ```

2. **If not set, manually configure:**
   ```bash
   # macOS/Linux
   bash scripts/setup-git-hooks.sh
   
   # Windows (PowerShell)
   powershell -ExecutionPolicy Bypass -File scripts/setup-git-hooks.ps1
   ```

3. **Check hook is executable (macOS/Linux):**
   ```bash
   ls -la .githooks/pre-push
   # Should see: -rwxr-xr-x (executable flag)
   ```

4. **Manually test hook:**
   ```bash
   .githooks/pre-push
   ```

#### "pnpm not found"

- Install pnpm: `npm install -g pnpm@latest`
- Verify: `pnpm -v` (should be ≥ 9)

#### "Node.js version is too old"

- Install Node.js ≥ 20
- Verify: `node -v` (should be ≥ 20.x.x)

#### "pnpm-lock.yaml not found"

- Run: `pnpm install`
- This generates the lock file

#### Hook Errors on Windows (CRLF vs LF)

Git may convert `.githooks/pre-push` to CRLF (Windows line endings), breaking the bash script.

**Solution:**
1. `.gitattributes` already forces LF for `.githooks/*`
2. If you cloned before `.gitattributes` was added:
   ```bash
   git rm --cached .githooks/pre-push
   git checkout .githooks/pre-push
   git add .githooks/pre-push
   git commit -m "fix: enforce LF line endings for hook"
   ```

#### "Lint/Build Passes Locally but Fails in CI"

- CI runs Node.js 20 and pnpm 9
- Ensure your local setup matches: `node -v`, `pnpm -v`
- Clear cache and reinstall: `rm -rf node_modules .next && pnpm install`
- CI logs available in GitHub **Actions** tab

---

## CI Workflow (GitHub Actions)

In addition to local hooks, a GitHub Actions workflow runs on every push and pull request.

### Trigger

The workflow in `.github/workflows/lint-and-build.yml` triggers on:
- **push** to any branch
- **pull_request** targeting any branch

### What It Runs

1. Checkout code
2. Setup Node.js v20
3. Install pnpm v9
4. Cache dependencies
5. Install dependencies (`pnpm install --frozen-lockfile`)
6. Run verification pipeline (`pnpm run verify`)

### Viewing Results

- **On Push:** Go to **Actions** → **Lint & Build** → most recent run
- **On Pull Request:** Check the **Checks** tab in the PR

If checks fail, fix locally and re-push; the workflow re-runs automatically.

---

## Branch Protection & Merge Policy

Recommended GitHub branch protection settings for `master` and `production`:

1. **Settings** → **Branches** → **Branch protection rules** → **Add rule**
2. Configure:
   - ✅ Require pull request before merging
   - ✅ Require status checks to pass (`Lint & Build` workflow)
   - ✅ Require branches to be up to date before merging
   - ✅ Restrict direct pushes (allow admin override)

**Result:**
- No direct pushes to protected branches (local hook + GitHub rule)
- PRs must pass CI before merge
- Code review + CI validation = safer deployments

---

## Development Workflow Example

### Feature Branch

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
echo "new feature" > src/feature.ts

# Commit
git add .
git commit -m "feat: add my feature"

# Push — hook runs lint/typecheck/build
git push origin feature/my-feature
# ✅ All pass → push succeeds
```

### Fix Lint Error

```bash
# Edit file
# Commit
git add .
git commit -m "fix: lint error"

# Push — hook checks again
git push origin feature/my-feature
# ❌ Lint still fails → push blocked
# Fix lint issues locally
pnpm run lint --fix
git add .
git commit -m "fix: resolve lint issues"
git push  # ✅ Now passes
```

### Pull Request & Merge

```bash
# Create PR on GitHub
# GitHub Actions runs: lint → typecheck → build
# Review by teammates
# Once approved + CI passes, merge
```

---

## Environment & Dependency Enforcement

### package.json Constraints

The repository enforces specific versions:

```json
{
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9"
}
```

### .npmrc Enforcement

```
engine-strict=true
```

**Effect:** `pnpm install` fails if Node/pnpm versions don't match.

### Checking Your Setup

```bash
node -v      # Should be ≥ 20.x.x
pnpm -v      # Should be ≥ 9.x.x
```

If either is too old, install/upgrade:
- Node: https://nodejs.org/ or use nvm
- pnpm: `npm install -g pnpm@latest`

---

## Questions or Issues?

- **Hook not running?** See [Troubleshooting](#troubleshooting)
- **CI failure?** Check **Actions** tab for detailed logs
- **Need to bypass?** Use `git push --no-verify` (local only; CI still enforces)
- **Team help?** Contact the DevOps team or check the GitHub Issues

#### If a Check Fails

Example output when lint fails:
```
🔐 Running pre-push checks for protected branch 'master'...
📦 Detected package manager: pnpm
✨ Running lint...
❌ Lint failed — push blocked
```

**To unblock:**
1. Fix the lint errors (run `pnpm lint` locally to see details)
2. Attempt `git push` again — the hook will re-run checks automatically

Example when build fails:
```
✅ Lint passed
🔨 Running build...
❌ Build failed — push blocked
```

**To unblock:**
1. Fix the build errors (run `pnpm build` locally to see details)
2. Attempt `git push` again

#### Feature Branch Workflow

Want to push a feature branch with errors for later fixing?
```bash
git checkout -b feature/my-feature
# Make changes, even with lint/build issues
git push origin feature/my-feature  # ✅ Hook skips checks — push succeeds
```

Once ready to merge into master/production:
1. Create a Pull Request
2. Wait for the CI workflow to run (see below)
3. Fix any lint/build failures
4. Once checks pass, merge via PR

### Remote Enforcement (GitHub Actions)

In addition to local checks, a GitHub Actions workflow enforces lint and build on all Pull Requests and direct pushes to protected branches.

#### CI Workflow

The workflow is defined in `.github/workflows/lint-and-build.yml` and:
- **Triggers** on: PR targeting master/production, or push to master/production
- **Runs**:
  - Lint check (`pnpm lint`)
  - Build check (`pnpm build`)
  - Uses cached dependencies for faster runs

Example workflow run output:
```
✓ Checkout code
✓ Setup Node.js (v20)
✓ Install pnpm
✓ Setup pnpm cache
✓ Install dependencies
✓ Run lint
✓ Run build
```

If any step fails, the checks will fail and you cannot merge the PR until they pass.

### Branch Protection Policy (GitHub)

To enforce the CI workflow remotely, configure branch protection rules on GitHub:

**For master and production branches:**

1. Go to: **Settings** → **Branches** → **Branch protection rules** → **Add rule**
2. Configure:
   - **Branch name pattern**: `master` (repeat for `production`)
   - ✅ **Require a pull request before merging**
     - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ **Require status checks to pass before merging**
     - Select: `Lint & Build` (the GitHub Actions workflow)
   - ✅ **Require branches to be up to date before merging**
   - ✅ **Restrict who can push to matching branches** (optional — allow admin to bypass)

**Result:**
- Direct pushes to `master`/`production` are rejected
- PRs must pass CI checks (lint + build) before merge
- Code review + CI = safer deployments

### Development Workflow Summary

#### Local Feature Development
```bash
# Create feature branch
git checkout -b feature/cool-feature

# Make changes (lint/build checks skipped on feature branch)
git add .
git commit -m "Add cool feature"

# Push — hook skips checks
git push origin feature/cool-feature
```

#### Merge to Protected Branch
```bash
# Create Pull Request on GitHub
# GitHub Actions runs: lint → build
# If checks fail, fix in your branch and re-push
# Once checks pass, teammates review
# After approval, merge PR
# GitHub enforces branch protection before merge
```

#### Direct Push to Master (If Allowed)
```bash
# Only local hooks block; GitHub branch protection also blocks direct push
git checkout master
git pull origin master
git merge feature/cool-feature
git push origin master  # Hook runs: lint → build → push proceeds or blocks
```

### Troubleshooting

**Q: Push to master is blocked with "Lint failed"**
- A: Run `pnpm lint` locally to see the errors. Fix them, then retry.

**Q: "Build failed — push blocked" on production**
- A: Run `pnpm build` locally. Review the errors, fix them, and retry `git push`.

**Q: I want to bypass local hook (not recommended)**
- A: Use `git push --no-verify` (dangerous — skips all hooks). Always ensure CI passes on GitHub.

**Q: Feature branch push is being blocked unexpectedly**
- A: Confirm your branch name is not `master` or `production`. Hook only protects those two.

**Q: CI passes locally but fails on GitHub**
- A: Node.js version or cache mismatch. GitHub runs v20 (Node). Ensure your local setup matches.

### Questions or Issues?

If the hook is not working or you need to bypass it, contact the DevOps team. For CI failures on GitHub, check the Actions logs under **Actions** → **Lint & Build** → most recent run.
