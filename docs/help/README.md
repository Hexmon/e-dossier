# Help Docs Authoring

This folder stores repo-managed Help Center content rendered at `/dashboard/help/*`.

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
- Prefer concise checklists over long paragraphs.

## v1 active docs

- `setup-guide.md`
- `org-templates.md`
- `physical-training-template.md`
- `olq-template.md`
- `grading-policy.md`

## future docs

- RBAC & Permissions
- Deployment & Environment
