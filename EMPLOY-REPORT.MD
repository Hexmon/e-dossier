You are working inside the local repository for https://github.com/Hexmon/e-dossier.

Task: Generate an evidence-based employee contributor performance data pack for Pratik Mahapatra / GitHub username Spidy2924 on branch master.

Do not invent any numbers. Run commands and produce exact outputs.

Requirements:

1. Prepare repo
- Run:
  git fetch --all --prune
  git checkout master
  git pull --ff-only origin master
- Record:
  current branch
  HEAD SHA
  total commits on master
  repository status

2. Identify contributor aliases
- Run git history commands to list all author names/emails:
  git log master --format='%aN <%aE>' | sort | uniq -c | sort -nr
- Identify all aliases likely belonging to Spidy2924 / Pratik Mahapatra.
- If GitHub CLI is available and authenticated, use GitHub API author filtering for username Spidy2924:
  gh api --paginate "/repos/Hexmon/e-dossier/commits?sha=master&author=Spidy2924"
- Compare GitHub username-based commit list with local author/email matching.
- Report any mismatch.

3. Commit metrics
Generate:
- total commits by Spidy2924
- non-merge commits
- merge commits
- first commit date
- latest commit date
- commits per month
- commits per week
- commits per day
- active commit days
- missing calendar days from first to latest commit
- missing weekdays from first to latest commit
- longest inactivity gaps
- commit burst days, meaning days with more than 5 commits

4. Lines of code metrics
Use git log --numstat for all commits by the contributor.

Calculate all of the following:
- total lines added
- total lines deleted
- net lines
- number of files touched
- production code lines added/deleted
- test code lines added/deleted
- documentation lines added/deleted
- config/build lines added/deleted
- generated/lock/artifact lines added/deleted

Use these exclusion rules for “clean code LOC”:
Exclude:
- pnpm-lock.yaml
- package-lock.json
- yarn.lock
- node_modules/**
- .next/**
- dist/**
- build/**
- coverage/**
- test-results/**
- playwright-report/**
- *.map
- generated files
- binary files
- image/font/media files

Still report excluded LOC separately so management can see how much came from non-code files.

5. Surviving current LOC ownership
Use git blame on current master to estimate how many current surviving lines are attributed to the contributor.

Include only source-like files:
- .ts
- .tsx
- .js
- .jsx
- .mjs
- .cjs
- .css
- .scss
- .json only if not lock/generated/config noise

Exclude:
- lock files
- generated files
- build artifacts
- test-results
- node_modules
- images/binaries

Output:
- surviving LOC by file
- total surviving LOC
- top 20 files owned by contributor

6. Code quality checks
Run available project checks:
- pnpm install
- pnpm lint
- pnpm typecheck, if script exists
- pnpm test, if script exists
- pnpm build

Before running, inspect package.json scripts and use exact script names.

Save command outputs under:
reports/spidy2924/raw/

7. ESLint / TypeScript issue attribution
If lint output can be JSON:
- run ESLint JSON report
- map each lint issue to current git blame author for that file/line
- count issues attributed to Spidy2924 vs other contributors
- report severity, rule, file, line, message

If TypeScript errors can be parsed:
- map TS errors by file/line to git blame author
- count errors attributed to Spidy2924

8. Commit-message quality
Analyze Spidy2924 commit messages for:
- generic messages: fixed, bug fixed, fixed issue, checking, error fixed, resolved conflicts, integration
- spelling issues: fuxed, fixedd, feauture, permisson, fileter, layoiut, academics if typo context appears
- messages shorter than 15 characters
- messages without module/scope
- merge commit messages
- build-error messages

Output:
- count and percentage of weak messages
- list of worst 30 messages with SHA/date

9. Rework / instability signals
Calculate:
- commits containing fixed/fix/issue/error/build/checking/conflict
- ratio of rework-like commits to total commits
- consecutive fix chains by date
- commits that only change tests or build config
- commits that reverse/delete recently added code if detectable

10. Pull request and GitHub check data
If gh CLI is available:
- list PRs authored by Spidy2924
- PR merged/unmerged counts
- PR review comments count
- CI status for commits/PRs
- check-suite conclusions for the contributor’s commits
- failing check count
- success rate

If gh CLI is unavailable, clearly mark this section as not available.

11. Output files
Create:
- reports/spidy2924/contributor_metrics.json
- reports/spidy2924/commit_metrics.csv
- reports/spidy2924/loc_by_file.csv
- reports/spidy2924/regularity.csv
- reports/spidy2924/code_quality_findings.csv
- reports/spidy2924/employee_performance_report.md

12. Report tone
Write the report in a strict but factual management style.
Use headings:
- Executive Summary
- Verified Metrics
- Lines of Code
- Regularity
- Code Quality
- Commit Discipline
- Risk Assessment
- Evidence
- Recommended Measurable Expectations

Do not invent facts. If something cannot be measured, mark it as “Not available” and explain what access/tool is required.