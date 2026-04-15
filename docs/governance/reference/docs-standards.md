# Docs Standards

This file defines the repository documentation information architecture and maintenance rules.

## Purpose

Keep documentation discoverable, consistent, and suitable for enterprise-scale maintenance.

## Structure Rules

- `README.md` at repo root is the repository entrypoint.
- `AGENTS.md` stays at repo root as repo-operational metadata.
- `docs/README.md` is the documentation portal.
- `docs/help/**` is runtime-loaded Help Center content and must stay path-stable unless code is updated in the same change.
- Audience-based sections under `docs/` are canonical:
  - `engineering/`
  - `operations/`
  - `governance/`
  - `reference/`

## Naming Rules

- Non-index Markdown files use lowercase kebab-case.
- `README.md` is reserved for landing pages and section indexes.
- One topic per document.
- Generated outputs must live in a `generated/` folder.

## Placement Rules

- Put developer learning and architecture content in `docs/engineering/`.
- Put runbooks and environment guidance in `docs/operations/`.
- Put standards, process, and policy docs in `docs/governance/`.
- Put stable factual material and machine-readable support assets in `docs/reference/`.
- Do not add new loose human-authored guides at the `docs/` root.

## Runtime Help Center Rules

- `docs/help/**` is for in-app Help Center content only.
- Do not move general repo docs into `docs/help/`.
- Help docs should use deterministic heading anchors and copy-paste-ready commands.

## Link Rules

- New links should point to canonical paths, not compatibility stubs.
- Relative links are preferred within the docs tree.
- Temporary compatibility stubs may exist for one transition cycle only.

## Ownership Rules

- The author of a docs-moving change must update:
  - Markdown links
  - script references
  - README links
  - packaging paths when runtime bundles include docs
- Generated docs must be clearly marked and must not be edited manually unless the generation workflow is intentionally bypassed and documented.
