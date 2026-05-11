# Employee Contributor Performance Report: Pratik Mahapatra / Spidy2924

Generated: 2026-05-09T18:02:04.187Z
Repository: Hexmon/e-dossier
Branch: master
HEAD: e30e59150d961ba468ffdfbcdca90d6616da84ed

## Executive Summary

This report is based on local git history on master after fetch, checkout, and fast-forward pull. The local aliases attributed to Pratik Mahapatra / Spidy2924 are `Pratik Mahapatra <pratikmahapatra29@gmail.com>` and `Spidy <105922663+Spidy2924@users.noreply.github.com>`.

Key findings: 197 commits were attributed locally, including 140 non-merge commits and 57 merge commits. The measured contribution window is 2025-11-21T15:37:02+05:30 through 2026-05-09T11:27:01+05:30. Clean-code LOC from numstat is +69922/-19592 (net 50330); excluded generated/lock/artifact/media LOC is +9013/-17311 (net -8298). Current surviving source-like LOC attributed by git blame is 45116. Standard checks passed: install, lint, typecheck, test, and build all exited 0.

GitHub PR/check data is Not available because `gh` is not installed in this environment. GitHub username-based commit comparison is therefore Not available; local author/email matching is the evidence source for commit attribution.

## Verified Metrics

- Current branch: master
- HEAD SHA: e30e59150d961ba468ffdfbcdca90d6616da84ed
- Total commits on master: 813
- Repository status at baseline: ## master...origin/master; ?? reports/
- Author aliases on master: Pratik Mahapatra <pratikmahapatra29@gmail.com> = 190; Spidy <105922663+Spidy2924@users.noreply.github.com> = 7
- GitHub CLI status: Not available; gh command not found.

Commit totals:

Metric | Value
--- | ---
Total commits | 197
Non-merge commits | 140
Merge commits | 57
First commit date | 2025-11-21T15:37:02+05:30
Latest commit date | 2026-05-09T11:27:01+05:30
Active commit days | 61
Missing calendar days | 109
Missing weekdays | 76

## Lines of Code

Metric | Added | Deleted | Net
--- | --- | --- | ---
All numstat LOC | 78935 | 36903 | 42032
Clean code LOC | 69922 | 19592 | 50330
Production | 59088 | 19185 | 39903
Tests | 8148 | 190 | 7958
Documentation | 0 | 0 | 0
Config/build | 2686 | 217 | 2469
Generated/lock/artifact/media excluded | 9013 | 17311 | -8298

Files touched by numstat: 649. Binary file touches: 3.

Surviving current source-like LOC: 45116 across 566 files. Source-like files scanned: 1296. Generated JSON snapshots and other config/generated noise are excluded from surviving ownership.

Top 20 surviving files:

File | Surviving LOC
--- | ---
src/app/db/queries/interviewTemplates.ts | 890
src/app/api/v1/admin/interview/pending/route.ts | 634
src/app/dashboard/settings/device/appointments/CadetAppointmentsSettingsPageClient.tsx | 611
src/app/db/queries/physicalTraining.ts | 611
src/hooks/useInterviewTemplates.ts | 611
src/app/db/queries/cadet-appointments.ts | 528
src/components/physic-training/PhysicalForm.tsx | 497
src/lib/interviewTemplateMatching.ts | 483
src/lib/interview-access.ts | 476
src/components/academics/SubjectWiseStudentsTable.tsx | 472
src/lib/interviewFormService.ts | 459
src/components/academics/AcademicTable.tsx | 442
src/hooks/usePhysicalTraining.ts | 436
src/app/dashboard/genmgmt/settings/site/page.tsx | 415
src/app/dashboard/genmgmt/camps/page.tsx | 406
src/components/physic-training/Swimming.tsx | 393
src/components/semester-record/semesterForm.tsx | 393
src/components/physic-training/IpetForm.tsx | 392
src/components/physic-training/HigherTests.tsx | 389
src/components/interview-term/TermSubForm.tsx | 380

## Regularity

Commits per month:

Month | Commits
--- | ---
2025-11 | 16
2025-12 | 19
2026-01 | 38
2026-02 | 56
2026-03 | 14
2026-04 | 44
2026-05 | 10

Longest inactivity gaps:

From | To | Inactive days
--- | --- | ---
2025-12-15 | 2025-12-27 | 11
2026-01-15 | 2026-01-27 | 11
2025-12-27 | 2026-01-06 | 9
2026-02-13 | 2026-02-23 | 9
2026-03-10 | 2026-03-18 | 7
2026-03-26 | 2026-04-03 | 7
2025-11-29 | 2025-12-06 | 6
2026-04-17 | 2026-04-24 | 6
2026-04-04 | 2026-04-10 | 5
2026-02-28 | 2026-03-05 | 4

Commit burst days, defined as more than 5 commits in one day:

Date | Commits
--- | ---
2026-01-13 | 9
2026-01-15 | 7
2026-01-30 | 7
2026-02-05 | 6
2026-02-06 | 8
2026-02-12 | 8
2026-02-13 | 6
2026-04-04 | 8
2026-04-11 | 8
2026-04-16 | 6

## Code Quality

Standard project checks:

Command | Exit code | Raw output
--- | --- | ---
pnpm install | 0 | reports/spidy2924/raw/11_pnpm_install.txt
pnpm run lint | 0 | reports/spidy2924/raw/12_pnpm_lint.txt
pnpm run typecheck | 0 | reports/spidy2924/raw/13_pnpm_typecheck.txt
pnpm test | 0 | reports/spidy2924/raw/14_pnpm_test.txt
pnpm run build | 0 | reports/spidy2924/raw/15_pnpm_build.txt
pnpm exec eslint . -f json -o reports/spidy2924/raw/16_eslint_report.json | 1 | reports/spidy2924/raw/16_eslint_json_run.txt
pnpm exec eslint <tracked source files> -f json -o reports/spidy2924/raw/17_eslint_tracked_source_report.json | 1 | reports/spidy2924/raw/17_eslint_tracked_source_run.txt

Structured attribution results:

- Standard `pnpm run lint` result: exit 0; no ESLint warnings or errors in that command output.
- Tracked-source ESLint JSON pass: 7 issues (6 errors, 1 warnings) across 1291 files linted.
- ESLint issues attributed to Spidy2924 by current git blame: 0.
- ESLint issues attributed to other contributors by current git blame: 7.
- TypeScript errors parsed: 0; Spidy2924-attributed TypeScript errors: 0.
- The direct `eslint .` JSON attempt is not used for attribution because it linted generated `.next` build output.

Findings:

Source | Severity | Rule/code | File | Line | Blame | Attribution
--- | --- | --- | --- | --- | --- | ---
eslint_tracked_source_json | error | @typescript-eslint/no-require-imports | scripts/runtime/edossier-migrate-runner.js | 3 | anuragkmr45 <anuragkmr825@gmail.com> | other_contributor
eslint_tracked_source_json | error | @typescript-eslint/no-require-imports | scripts/runtime/edossier-migrate-runner.js | 4 | anuragkmr45 <anuragkmr825@gmail.com> | other_contributor
eslint_tracked_source_json | error | @typescript-eslint/no-require-imports | scripts/runtime/edossier-migrate-runner.js | 5 | anuragkmr45 <anuragkmr825@gmail.com> | other_contributor
eslint_tracked_source_json | error | @typescript-eslint/no-require-imports | scripts/runtime/edossier-migrate-runner.js | 6 | anuragkmr45 <anuragkmr825@gmail.com> | other_contributor
eslint_tracked_source_json | error | @typescript-eslint/no-require-imports | scripts/runtime/edossier-migrate-runner.js | 7 | anuragkmr45 <anuragkmr825@gmail.com> | other_contributor
eslint_tracked_source_json | warning | jsx-a11y/alt-text | tests/lib/login-page-client.test.tsx | 13 | anuragkmr45 <anuragkmr825@gmail.com> | other_contributor
eslint_tracked_source_json | error | @next/next/no-assign-module-variable | tests/utils/generic-api-mocks.ts | 390 | anuragkmr45 <anuragkmr825@gmail.com> | other_contributor

## Commit Discipline

Signal | Count / Value
--- | ---
Weak messages | 197 / 197 (100%)
Generic messages | 81
Spelling-issue messages | 6
Messages shorter than 15 characters | 28
Messages without module/scope | 143
Merge commit messages | 57
Build-error messages | 9

Worst 30 messages by the configured weak-message flags:

SHA | Date | Message
--- | --- | ---
50203f9 | 2026-02-13T04:58:19+05:30 | fixed build
cd67bd7 | 2026-02-12T21:28:24+05:30 | fixed build
708b925 | 2026-02-06T19:12:14+05:30 | fixed build
38e0ea8 | 2026-05-05T22:04:27+05:30 | fuxed build error
ab07886 | 2026-05-03T14:27:48+05:30 | fixed issues
cb117c2 | 2026-04-17T12:49:26+05:30 | fixed build error
bbd75ec | 2026-04-16T01:42:09+05:30 | fixed stale build issue
6002909 | 2026-04-12T00:33:33+05:30 | fixed build errors.
90b9327 | 2026-04-11T09:47:08+05:30 | fixed point 30
0ee3e4c | 2026-04-11T09:16:58+05:30 | fixed point 32
443c463 | 2026-04-11T09:01:37+05:30 | Fixed point 33
ec2f15b | 2026-04-11T07:42:07+05:30 | bug fixed
270376b | 2026-04-04T01:04:11+05:30 | fixed point 30
19a8f8e | 2026-04-03T23:57:34+05:30 | fixed
6ba91c1 | 2026-03-18T15:37:09+05:30 | checking
a491adc | 2026-03-06T16:27:41+05:30 | checking
f01f796 | 2026-02-27T18:08:14+05:30 | fixed build errors
6e851b5 | 2026-02-13T02:43:52+05:30 | fixed color
deba97d | 2026-02-12T21:20:41+05:30 | fixed
19fc681 | 2026-02-12T21:20:32+05:30 | fixed UI
010117a | 2026-02-09T19:50:06+05:30 | fixed
7eff1f1 | 2026-02-09T19:46:57+05:30 | fixed error
9c89e82 | 2026-02-09T19:02:36+05:30 | error fixed
feace43 | 2026-02-06T19:23:05+05:30 | fixed
b010ad0 | 2026-02-06T19:19:42+05:30 | fixed issues
ccceb67 | 2026-02-06T17:50:14+05:30 | fixed build issue
5c31d8c | 2026-02-06T16:51:17+05:30 | fixed error
cd7e2fc | 2026-02-05T17:26:14+05:30 | fixedd
45ebc30 | 2026-02-05T15:07:31+05:30 | Fixed issue
0ac2798 | 2026-01-29T00:59:16+05:30 | integration

## Risk Assessment

- 86 commits matched rework-like terms out of 197, a ratio of 43.65%.
- 23 consecutive rework/fix chains were detected by commit subject/date ordering.
- 4 commits changed only tests or build/config files after excluding generated artifacts.
- No explicit revert commits were detected. Reverse/delete of recently added code is marked Not confidently detectable without semantic patch analysis.

The strongest management risks shown by measurable evidence are high weak-message rate, high rework-like commit ratio, and bursty delivery days. Standard checks currently pass on master, so this report does not claim current build failure.

## Evidence

Primary generated files:

- reports/spidy2924/contributor_metrics.json
- reports/spidy2924/commit_metrics.csv
- reports/spidy2924/loc_by_file.csv
- reports/spidy2924/surviving_loc_by_file.csv
- reports/spidy2924/regularity.csv
- reports/spidy2924/code_quality_findings.csv
- reports/spidy2924/employee_performance_report.md

Raw command outputs:

- reports/spidy2924/raw/01_git_fetch_all_prune.txt
- reports/spidy2924/raw/02_git_checkout_master.txt
- reports/spidy2924/raw/03_git_pull_ff_only_origin_master.txt
- reports/spidy2924/raw/04_repo_baseline.txt
- reports/spidy2924/raw/05_author_aliases_all.txt
- reports/spidy2924/raw/06_gh_auth_status.txt
- reports/spidy2924/raw/07_package_scripts.txt
- reports/spidy2924/raw/08_spidy_local_commit_list.tsv
- reports/spidy2924/raw/09_spidy_numstat.txt
- reports/spidy2924/raw/11_pnpm_install.txt
- reports/spidy2924/raw/12_pnpm_lint.txt
- reports/spidy2924/raw/13_pnpm_typecheck.txt
- reports/spidy2924/raw/14_pnpm_test.txt
- reports/spidy2924/raw/15_pnpm_build.txt
- reports/spidy2924/raw/17_eslint_tracked_source_report.json
- reports/spidy2924/raw/surviving_loc_by_file.csv

## Recommended Measurable Expectations

- Require module-scoped commit subjects for at least 90% of future commits, measured weekly from git log.
- Keep generic/fix-only commit messages below 10% of future commits, measured weekly from git log.
- Require PR-level verification evidence before merge: lint, typecheck, tests, and build passing.
- Track rework-like commit ratio monthly and target below 20% unless tied to planned bug-fix work.
- Track burst days and require grouping related small fixes into reviewed PRs with a clear summary and test note.
