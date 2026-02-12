# Theming Guide

This project uses token-driven theming. Accent palette and dark/light mode only work correctly when UI code uses semantic tokens.

## Core Rules
- Use semantic token classes only: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`, `bg-primary`, `text-primary-foreground`, `text-primary`, `bg-accent`, `bg-destructive`, `bg-success`, `bg-warning`, `bg-info`.
- Do not hardcode Tailwind palette classes in components (`bg-blue-*`, `text-gray-*`, etc.).
- Do not use raw color literals in components (`#hex`, `rgb()`, `hsl()`).
- Exception files for raw tokens:
  - `src/app/globals.css`
  - `src/lib/accent-palette.ts`
  - `src/lib/device-site-settings.ts`

## Accent + Theme Runtime
- Accent is applied using `html[data-accent="..."]` and token overrides.
- Theme mode is applied via `html` theme attributes and `.dark` compatibility class.
- Components must rely on tokens so runtime palette changes apply instantly.

## Status Colors
Use semantic status tokens:
- Success: `bg-success`, `text-success`, `text-success-foreground`
- Warning: `bg-warning`, `text-warning`, `text-warning-foreground`
- Info: `bg-info`, `text-info`, `text-info-foreground`
- Error: `bg-destructive`, `text-destructive`, `text-destructive-foreground`

## Charts
- Use `src/components/performance_graph/chartTheme.ts` to resolve chart colors from CSS variables.
- Avoid hardcoded chart dataset colors.

## Enforcement
Run:
- `pnpm run lint:theme`

This check is also part of `pnpm lint` and CI/pre-push flows.
