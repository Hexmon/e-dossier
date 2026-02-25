# Feature Examples (Trace It Yourself)

This document gives practical end-to-end examples from this repo.

## Example 1: Hero Background Update Path

### Start here
- `src/app/dashboard/genmgmt/settings/site/page.tsx`
- `src/hooks/useAdminSiteSettings.ts`
- `src/app/lib/api/siteSettingsAdminApi.ts`

### Read in this order
1. Admin page upload logic and image validation:
   - `src/app/dashboard/genmgmt/settings/site/page.tsx`
2. Mutation orchestration and query invalidation:
   - `src/hooks/useAdminSiteSettings.ts`
3. API endpoints used by admin page:
   - `src/app/lib/api/siteSettingsAdminApi.ts`
4. Presign and delete backend routes:
   - `src/app/api/v1/admin/site-settings/hero-bg/presign/route.ts`
   - `src/app/api/v1/admin/site-settings/hero-bg/route.ts`
   - `src/app/api/v1/admin/site-settings/route.ts`
5. Storage helper and object operations:
   - `src/app/lib/storage.ts`
6. Site settings DB query/schema:
   - `src/app/db/queries/site-settings.ts`
   - `src/app/db/schema/auth/siteSettings.ts`
7. Public landing rendering:
   - `src/app/lib/public-site-settings.ts`
   - `src/components/Hero.tsx`
   - `src/app/page.tsx`

### Common breakpoints/log points
- Frontend file validation before presign (`handleHeroBgFileInput` flow in site settings page).
- Presign route after schema parse in `hero-bg/presign/route.ts`.
- Storage call in `createPresignedUploadUrl` in `src/app/lib/storage.ts`.
- Site settings update in `updateSiteSettings` in `src/app/db/queries/site-settings.ts`.
- Landing settings fetch in `fetchLandingSiteSettings` in `src/app/lib/public-site-settings.ts`.

### What to test manually
- Upload valid image, save settings, refresh landing page and verify hero background changed.
- Upload invalid dimensions/type/size and confirm clear validation error appears.
- Delete hero background and verify fallback image renders on landing.

## Example 2: Public Platoon Commander History Page

### Start here
- `src/components/PlatoonsSection.tsx`
- `src/app/platoon/[platoonKey]/page.tsx`
- `src/components/platoon/PublicCommanderHistory.tsx`

### Read in this order
1. Landing card link generation:
   - `src/components/PlatoonsSection.tsx`
2. Public platoon page data fetch:
   - `src/app/platoon/[platoonKey]/page.tsx`
3. Public fetch helpers:
   - `src/app/lib/public-platoons.ts`
4. Public API routes:
   - `src/app/api/v1/platoons/[idOrKey]/route.ts`
   - `src/app/api/v1/platoons/[idOrKey]/commander-history/route.ts`
5. Shared history query:
   - `src/app/db/queries/platoon-commanders.ts`
6. Interactive history UI:
   - `src/components/platoon/PublicCommanderHistory.tsx`

### Common breakpoints/log points
- Params decode and fetch call in `src/app/platoon/[platoonKey]/page.tsx`.
- Public history route response mapping in `src/app/api/v1/platoons/[idOrKey]/commander-history/route.ts`.
- Status derivation/sorting in `getPlatoonCommanderHistoryByIdOrKey` in `src/app/db/queries/platoon-commanders.ts`.
- Selected commander state logic in `PublicCommanderHistory`.

### What to test manually
- Click `More` on different platoon cards and verify URL is `/platoon/{key}`.
- Confirm list shows CURRENT first and PREVIOUS ordered by latest start date.
- Click multiple commanders and verify detail panel updates inline.
- Visit an invalid key and confirm not-found behavior.

## Example 3: User CRUD Path

### Start here
- `src/app/dashboard/genmgmt/usersmgmt/page.tsx`
- `src/hooks/useUsers.ts`
- `src/app/lib/api/userApi.ts`

### Read in this order
1. Users page and dialog wiring:
   - `src/app/dashboard/genmgmt/usersmgmt/page.tsx`
   - `src/components/users/UserFormDialog.tsx`
   - `src/components/users/UserCard.tsx`
2. Hook queries and mutations:
   - `src/hooks/useUsers.ts`
3. API module:
   - `src/app/lib/api/userApi.ts`
4. Backend routes:
   - `src/app/api/v1/admin/users/route.ts`
   - `src/app/api/v1/admin/users/[id]/route.ts`
5. User list query and DB logic:
   - `src/app/db/queries/users.ts`
   - `src/app/db/schema/auth/users.ts`

### Common breakpoints/log points
- `onSubmit` in users page (distinguishes create vs edit).
- `saveUser` in `src/app/lib/api/userApi.ts` (POST/PATCH routing).
- Validation failure path in `src/app/api/v1/admin/users/route.ts`.
- Uniqueness pre-check and conflict response in users POST route.
- Soft-delete active appointment guard in `src/app/api/v1/admin/users/[id]/route.ts`.

### What to test manually
- Create user with unique username/email/phone and verify it appears in list.
- Attempt duplicate username/email/phone and verify conflict message.
- Edit user fields and verify updated values persist.
- Try deleting user with active appointment and verify conflict guard.
- Delete eligible user and verify soft-delete behavior.
