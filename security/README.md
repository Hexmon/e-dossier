# Security Scanning

This project uses three security scanning tools integrated into CI and available for local use. All tools run via Docker — no local installs required (except Docker itself).

## Tools

| Tool | Type | What it checks |
|------|------|----------------|
| **Semgrep** | SAST (Static Analysis) | Code patterns — injection, XSS, insecure crypto, OWASP Top 10 |
| **pnpm audit / Snyk** | SCA (Software Composition Analysis) | Known vulnerabilities in dependencies |
| **OWASP ZAP** | DAST (Dynamic Analysis) | Running application — headers, cookies, common web vulns |

## Prerequisites

| Tool | Install | Required for |
|------|---------|--------------|
| Docker | [docker.com](https://www.docker.com/) | `pnpm security:semgrep`, `pnpm security:zap` |
| Snyk (optional) | `npx snyk@latest auth` | CI Snyk job |

### pnpm / Corepack Setup

The project uses an exact `packageManager` field. If pnpm isn't available or you see version mismatch warnings:

```bash
corepack enable
corepack prepare pnpm@10.25.0 --activate
```

## Local Usage

### Run All Scans

```bash
pnpm security
```

Runs Semgrep, dependency audit (report mode), and ZAP in sequence. Requires Docker running and (for ZAP) the app serving at `ZAP_TARGET_URL`.

### Semgrep (SAST)

```bash
pnpm security:semgrep
```

Runs Semgrep via Docker (`returntocorp/semgrep`) with six rulesets: `p/javascript`, `p/typescript`, `p/react`, `p/nodejs`, `p/security-audit`, `p/owasp-top-ten`.

Output: `.security/semgrep.sarif` (SARIF format).

Path exclusions are configured in `.semgrep.yml` (node_modules, .next, dist, build, coverage, drizzle, minified files).

### Dependency Audit (SCA)

```bash
# Fail on high/critical (CI mode)
pnpm security:audit

# Generate JSON report without failing (local mode)
pnpm security:audit:report
```

- `security:audit` — Runs `pnpm audit --audit-level=high`. Exits non-zero if high/critical vulnerabilities are found.
- `security:audit:report` — Same scan but writes JSON output to `.security/pnpm-audit.json` and always exits 0.

### OWASP ZAP (DAST)

```bash
# Start the app first
pnpm dev

# In another terminal — run ZAP (defaults to http://host.docker.internal:3000)
pnpm security:zap

# Or override the target URL
ZAP_TARGET_URL=http://host.docker.internal:4000 pnpm security:zap
```

ZAP runs inside Docker, so the default target is `http://host.docker.internal:3000` (Docker's alias for the host machine on macOS/Windows). The app must be running and listening on `0.0.0.0` or the default Next.js binding before you start the scan.

If Next.js dev server isn't reachable from Docker, start it with:

```bash
pnpm dev -- --hostname 0.0.0.0
```

Output: `.zap/zap-report.html`.

## CI Behavior

The security workflow (`.github/workflows/security.yml`) runs separately from the lint-and-build workflow.

| Job | Trigger | Failure behavior |
|-----|---------|-----------------|
| **Semgrep** | Push to master, PRs to master | Reports findings via SARIF (GitHub Security tab) |
| **Dependency Audit** | Push to master, PRs to master | Fails on high/critical vulnerabilities |
| **ZAP Scan** | Weekly (Sunday 02:00 UTC), manual dispatch | Uploads HTML report as artifact |

## Required Secrets & Variables

| Name | Type | Required | Used by |
|------|------|----------|---------|
| `SNYK_TOKEN` | Repository variable | No | Snyk scan (skipped if not set) |
| `ZAP_TARGET_URL` | Repository variable | No | ZAP scan (skipped if not set) |

Configure these in **Settings > Secrets and variables > Actions > Variables**.

## Output Files

All scan output is gitignored (`.security/`, `.zap/`):

| File | Source |
|------|--------|
| `.security/semgrep.sarif` | Semgrep SAST scan |
| `.security/pnpm-audit.json` | Dependency audit report |
| `.zap/zap-report.html` | OWASP ZAP baseline scan |

## Triage Guidelines

### Severity Levels

- **Critical / High** — Fix before merging. These represent exploitable vulnerabilities.
- **Medium** — Fix within the current sprint. Evaluate actual exploitability in context.
- **Low / Info** — Address when convenient. Often false positives or low-impact issues.

### Common False Positives

- **Semgrep on drizzle migrations** — Excluded via `.semgrep.yml`. If you see SQL-related findings in `drizzle/`, verify the exclusion is in place.
- **Dependency audit on transitive deps** — If a vulnerability is in a transitive dependency with no fix available, document it and monitor for updates.
- **xlsx (SheetJS)** — The npm package `xlsx` maxes out at 0.18.5; newer versions are only available via SheetJS Pro. CVE-2023-30533 (Prototype Pollution) and CVE-2024-22363 (ReDoS) have no npm patch and are suppressed via `pnpm.auditConfig.ignoreCves` in `package.json`. Consider migrating to `exceljs` if the risk is unacceptable.

### Workflow

1. Run scans locally before pushing (`pnpm security:semgrep && pnpm security:audit`)
2. Review CI findings in the GitHub Security tab (Semgrep) or job logs (audit)
3. For each finding: assess severity, determine if it's a true positive, and fix or document
4. High/critical findings should block PR merges
