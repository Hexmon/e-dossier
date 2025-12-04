# Security Policy

This document describes how security vulnerabilities should be reported and handled for the **e-dossier** project (Next.js + Drizzle ORM + PostgreSQL dossier management app).

---

## Supported Versions

At the moment, e-dossier is under active development and does not have formal tagged releases. Security fixes are applied to the default branch only.

| Version / Branch | Supported for Security Fixes |
| ---------------- | ---------------------------- |
| `master` (default branch) | ✅ |
| Any other branch, tag, or fork | ❌ |

If we start publishing versioned releases in the future, this section will be updated with a detailed support matrix.

---

## Reporting a Vulnerability

If you believe you have found a security vulnerability in e-dossier, **please do not open a public GitHub issue**.

Instead, use one of the following private channels:

1. **GitHub Security Advisories (preferred)**  
   - Go to the repository’s **Security** tab.  
   - Use the **“Report a vulnerability”** / **“Private vulnerability reporting”** feature if available.

2. **Email**  
   - Send details to: **security@hexmontechnology.com**  
   - If that address is unavailable, you can also reach the team at: **contact@hexmontechnology.com**

We appreciate responsible disclosure and will work with you to investigate and remediate valid issues.

---

## What to Include in a Report

To help us triage your report quickly and accurately, please include as much of the following as possible:

- **Description** of the vulnerability and its potential impact.
- **Steps to reproduce**:
  - Clear, step-by-step instructions.
  - Any scripts, payloads, or PoC code (sanitized).
- **Environment details**:
  - Commit hash or branch name (e.g. `master` at a given date).
  - Node.js version, OS, browser (if relevant).
- **Configuration details** (if relevant):
  - Any custom config or deployment specifics that matter (e.g. reverse proxy, TLS termination, Postgres version).
- **Affected area**:
  - API route, page, or component involved (e.g. specific Next.js route or dossier action).

Please **do not** include real-world sensitive data (actual personal dossiers, real secrets, etc.) in your report. Use anonymized or synthetic data when demonstrating the issue.

---

## Our Response Process

When you report a vulnerability through one of the channels above, you can generally expect the following:

1. **Acknowledgement**  
   We aim to acknowledge your report within **3 business days**.

2. **Triage & Assessment**  
   We will:
   - Confirm whether we can reproduce the issue.
   - Assign a preliminary **severity** (Critical / High / Medium / Low).
   - Determine affected components and scope.

3. **Remediation**  
   - For **Critical/High** issues, we prioritize a fix as soon as possible, which may include an out-of-band patch.
   - For **Medium/Low** issues, the fix may be included in the normal development cycle.

4. **Coordinated Disclosure**  
   Once a fix is ready:
   - We will merge the patch into the default branch.
   - We may publish release notes and, if appropriate, a security advisory describing the issue in sanitized terms.
   - We will coordinate with you on timing if you wish to publish your own write-up.

We kindly ask that you **do not publicly disclose** the vulnerability details until we have had a reasonable opportunity to investigate and release a fix.

---

## Scope

### In Scope

Issues related to:

- The **application code** in this repository (Next.js, API routes, auth logic, RBAC, dossier CRUD, etc.).
- **Database access layer** and queries (Drizzle ORM models, migrations, and DB interactions).
- **Deployment scripts** under `docs/deploy` when used as documented (for example, misconfigurations that the scripts create by default).

Typical in-scope examples:

- Authentication / session handling weaknesses.
- Authorization / access control bypasses (e.g. accessing other users’ dossiers).
- Injection vulnerabilities (SQL injection, XSS, command injection, etc.).
- Insecure direct object references (IDOR).
- Leaks of sensitive data or documents due to logic or configuration flaws in this repo.

### Out of Scope

The following are generally **out of scope** for this project:

- Vulnerabilities in:
  - The underlying **OS**, Postgres installation, or hosting platform (cloud provider, containers, etc.) not configured via this repo.
  - Third-party services or libraries, unless the vulnerability is due to how we use them here.
- Issues requiring:
  - Unreasonable or unrealistic attack conditions (e.g. massive DDoS beyond a normal web app).
  - Full control of the victim’s device or network (e.g. local malware, MITM outside TLS misconfiguration we cause).
- Social engineering attacks (phishing, impersonation, etc.).
- Purely theoretical attacks without a clear security impact on confidentiality, integrity, or availability.

If you’re unsure whether something is in scope, **please report it anyway**—we’ll let you know how we classify it.

---

## Data & Privacy Note

e-dossier is designed to manage potentially sensitive dossier information. When testing or reporting issues:

- Please use **test accounts** and **fake / synthetic data**.
- Do not share real personal or confidential dossier content in public places (including GitHub issues, PRs, or screenshots).

If your report involves real data that cannot be redacted, contact us first and we will try to arrange a safer way to receive the details.

---

## Recognition

We are grateful to security researchers and users who help keep e-dossier safe.

If you report a valid security vulnerability and would like to be credited, we can (with your permission):

- Thank you in the relevant commit message, and/or
- Mention you in release notes or a security advisory.

We currently do **not** run a paid bug bounty program, but we highly value your time and responsible disclosure.

Thank you for helping us improve the security of e-dossier.
