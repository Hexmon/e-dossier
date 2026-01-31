# Contributing to e-dossier

## Code Quality & Push Policy

This repository enforces a strict lint and build gate to ensure code quality on protected branches.

### Pre-Push Hook (Local Enforcement)

A Git hook is enabled locally to enforce lint and build checks **before pushing to protected branches** (master and production).

#### What It Does

When you attempt to push to `master` or `production`:
1. Runs `pnpm lint` — checks code style and quality
2. Runs `pnpm build` — ensures your code compiles without errors
3. Only proceeds with the push if both pass

#### Which Branches Are Protected

- **master** — production-ready code, required to pass lint + build
- **production** — live deployment branch, required to pass lint + build
- **Feature branches** (feature/*, bugfix/*, etc.) — checks are skipped to allow faster local development

#### Enabling the Hook

The hook is already configured in `.git/hooks/pre-push`. To ensure it's executable, run:

**On macOS / Linux:**
```bash
chmod +x .git/hooks/pre-push
```

**On Windows:**
- ✅ **Git Bash** (recommended): `chmod +x .git/hooks/pre-push`
- ✅ **PowerShell**: See [WINDOWS_SETUP.md](../WINDOWS_SETUP.md)

For detailed Windows setup, see [WINDOWS_SETUP.md](../WINDOWS_SETUP.md)

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
