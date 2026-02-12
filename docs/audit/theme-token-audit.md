# Theme Token Audit (Completed)

## Root Causes Found
- Config-driven cards used raw class strings (`color`) that bypassed theme tokens.
- Many pages/components used hardcoded Tailwind palette classes (`bg-blue-*`, `text-gray-*`, etc.).
- Chart datasets and UI chrome used literal `rgb/#hex` values.
- Some wrappers (tabs/tables/sidebar variants) mixed semantic tokens with fixed colors.

## Fix Categories
- `src/app/globals.css`: Added semantic status tokens (`success`, `warning`, `info`) and kept accent-driven token model.
- `src/lib/theme-color.ts`: Added central tone/surface resolver helpers.
- `src/config/app.config.ts` and dashboard cards/layouts: Migrated to tone keys.
- `src/components/performance_graph/*`: Migrated charts to CSS-var-driven palette helper.
- `src/components/**` and `src/app/dashboard/**`: Replaced hardcoded classes with semantic token classes.
- `scripts/check-theme-token-compliance.ts`: Added CI guard against reintroducing hardcoded colors.

## Verification Snapshot
- Hardcoded color grep checks now return no matches for forbidden patterns.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass.
