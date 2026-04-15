# Documentation Portal

Use this directory as the canonical home for repository documentation.

## Audience Sections

- [Engineering](engineering/README.md)
  Design explanations, onboarding guides, implementation walkthroughs, testing, and UI/engineering practices.
- [Operations](operations/README.md)
  Deployment, environment, release, and on-prem runtime documentation for support and infrastructure teams.
- [Governance](governance/README.md)
  Repository contribution rules, documentation standards, and security process documentation.
- [Reference](reference/README.md)
  Stable reference material, generated database artifacts, API notes, and RBAC reference assets.
- [Help Center Runtime Content](help/README.md)
  App-rendered help content that is loaded at runtime and intentionally stays path-stable under `docs/help/`.

## Root Exceptions

- `README.md` stays at the repository root as the repo entrypoint.
- `AGENTS.md` stays at the repository root as repo-operational metadata.
- `docs/help/**` stays in place because the application loads it directly.

## Migration Note

Some old documentation paths remain as short compatibility stubs for one transition cycle. Use the links above as the canonical structure for all new references.
