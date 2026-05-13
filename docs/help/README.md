# Help Docs Authoring

This folder stores repo-managed Help Center content rendered at `/dashboard/help/*`.

It is runtime content, not the general repository documentation home. General repo docs belong under the audience-based sections rooted at `docs/README.md`.

## Rules

- Keep one document per guide.
- Use deterministic section anchors in headings:

```md
## 1. Section Name {#section-anchor}
```

- Use fenced Mermaid blocks for diagrams:

```mermaid
flowchart LR
  A --> B
```

- Keep commands copy-paste ready.
- Use concise checklists for operator actions, then add detailed reference sections for data ownership, dependencies, QA evidence, and troubleshooting.
- For module guides, include route, audience, managed data, workflow, business rules, validation, related pages, and a detailed appendix when the module affects other workflows.
- Do not document behavior that is not backed by code, routes, scripts, or verified product workflows.
- When adding new help sections, update `src/app/lib/help/help-index.ts` so search can find the guide and section anchors.

## v1 active docs

- `software-overview.md`
- `setup-guide.md`
- `org-templates.md`
- `physical-training-template.md`
- `olq-template.md`
- `grading-policy.md`
- `admin-operations.md`
- `general-management.md`
- `module-management.md`
- `dossier-management.md`
- `bulk-upload.md`
- `reports.md`
- `settings-controls.md`
- `rbac-permissions.md`
- `deployment-environment.md`
