# Dynamic Sidebar Navigation Design (Backend-Driven)

## 1. Executive Summary
This design moves the sidebar navigation logic from a hardcoded frontend array to a backend-driven API (`GET /api/v1/me/navigation`). This ensures the sidebar strictly reflects the user's server-side permissions, eliminating UI/API state mismatch and enforcing "security by design".

## 2. Architecture

### 2.1 Backend: The Source of Truth
The backend will maintain a canonical `NAVIGATION_TREE` configuration. When a user requests navigation, the backend will:
1.  Load the full tree.
2.  Filter nodes based on the current user's `Principal` (Roles + Permissions + Engine Rules).
3.  Return a personalized, flattened or nested list of allowed navigation items.

### 2.2 Frontend: Reactive Rendering
The frontend `AppSidebar` will:
1.  Fetch navigation data via `useNavigation` (React Query).
2.  Render the returned tree structure.
3.  Handle special interactions (e.g., "Dossier Management" modal) via stable key matching.
4.  Highlight active routes based on the returned `url`.

---

## 3. API Design

### Endpoint
`GET /api/v1/me/navigation`

### Response Schema
```json
{
  "generatedAt": "2026-02-12T10:00:00Z",
  "sections": [
    {
      "key": "dashboard",
      "label": "Dashboard",
      "items": [
        {
          "key": "home",
          "label": "Home",
          "url": "/dashboard",
          "icon": "Home",
          "badge": null
        }
      ]
    },
    {
      "key": "admin",
      "label": "Admin",
      "items": [
        {
          "key": "admin_mgmt",
          "label": "Admin Management",
          "url": "/dashboard/genmgmt",
          "icon": "Book",
          "children": []
        }
      ]
    },
    {
      "key": "dossier",
      "label": "Dossier",
      "items": [
        {
          "key": "dossier_mgmt",
          "label": "Dossier Management",
          "url": "/milmgmt", // Special key for modal trigger
          "icon": "NotebookPen",
          "specialAction": "OPEN_OC_MODAL"
        }
      ]
    }
  ]
}
```

---

## 4. Permission Mapping (Server-Side)

We will define a `NavConfig` that maps navigation nodes to **Actions** defined in our RBAC system.

### `src/app/lib/navigation/config.ts`
```typescript
export const NAVIGATION_TREE: NavSectionConfig[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    items: [
      {
        key: "home",
        label: "Home",
        url: "/dashboard",
        icon: "Home",
        // No permission required (public-ish dashboard area) OR base permission
        requiredAction: "dashboard:view", 
      }
    ]
  },
  {
    key: "admin",
    label: "Admin",
    // Section-level permission check
    requiredAction: "admin:view_section",
    items: [
      {
        key: "admin_mgmt",
        label: "Admin Management",
        url: "/dashboard/genmgmt",
        icon: "Book",
        requiredAction: "page:admin:genmgmt:view", // Mapped to resolvePageAction
        adminBaseline: true
      }
    ]
  },
  {
    key: "academics",
    label: "Academics",
    items: [
      {
        key: "manage_marks",
        label: "Academics Management",
        url: "/dashboard/manage-marks",
        icon: "BookOpen",
        requiredAction: "page:manage-marks:view",
        adminBaseline: true
      }
    ]
  }
];
```

### Authorization Logic (`route.ts`)
```typescript
const engine = createAuthzEngine();
const principal = await createPrincipal(request); // Standard principal build

const visibleSections = NAVIGATION_TREE.map(section => {
  // 1. Check section-level access (optional optimization)
  if (section.requiredAction && !engine.evaluate(principal, section.requiredAction)) {
    return null;
  }
  
  // 2. Filter items
  const visibleItems = section.items.filter(item => {
    // Super Admin bypass
    if (principal.roles.includes('SUPER_ADMIN')) return true;
    
    // Admin Baseline check
    if (item.adminBaseline && principal.roles.includes('ADMIN')) return true;

    // Specific Action check
    if (item.requiredAction) {
      return engine.evaluate(principal, item.requiredAction) === 'ALLOW';
    }
    
    return true; // Default allowed if no restrictions
  }).map(item => ({...item})); // Clone

  if (visibleItems.length === 0) return null;

  return { ...section, items: visibleItems };
}).filter(Boolean);
```

---

## 5. Frontend Implementation

### 5.1 `useNavigation` Hook
```typescript
export function useNavigation() {
  return useQuery({
    queryKey: ['navigation', 'me'],
    queryFn: async () => {
      const res = await fetch('/api/v1/me/navigation');
      if (!res.ok) throw new Error('Failed to fetch navigation');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (user can refresh if needed)
    placeholderData: FALLBACK_NAV // Safe minimal nav (Home + Dossier)
  });
}
```

### 5.2 Updates to `AppSidebar.tsx`
- **Current:** Imports `menuItems` from constants.
- **New:** Calls `useNavigation()`.
  - `isLoading`: Show Skeleton sidebar.
  - `data`: Iterate over `data.sections`.
  - `specialAction === 'OPEN_OC_MODAL'`: Bind click handler to existing modal logic.

---

## 6. Security & Consistency

1.  **Not Security Gate:** Explicitly document that Sidebar hiding is for UX. The real gate is the API `withAuthz` wrapper and the `resolvePageAction` check on `page.tsx`.
2.  **Sync:** We must ensure the `requiredAction` in `NavConfig` matches the `action` used in `resolvePageAction`.
    -   *Strategy:* Reuse `PAGE_ACTION_MAP` logic where possible, or define shared constants for action strings.

---

## 7. Phased Rollout Plan

-   **Phase 1 (Backend):** Implement the API and the engine logic. Verify it returns correct trees for Admin, Platoon Cdr, and standard User.
-   **Phase 2 (Frontend Hybrid):** Implement `useNavigation` but keep using static list in `AppSidebar` behind a feature flag. Log discrepancies.
-   **Phase 3 (Cutover):** Switch `AppSidebar` to use `useNavigation`. Keep static list as `FALLBACK_NAV` for error states.
