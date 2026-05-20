import { NextRequest, NextResponse } from "next/server";
import { NAVIGATION_TREE, NavSectionConfig } from "@/app/lib/navigation/config";
import { handleApiError } from "@/app/lib/http";
import { requireAuth } from "@/app/lib/guard";
import { withAuditRoute } from "@/lib/audit";
import {
  filterNavigationSectionsForResolvedAccess,
  resolveModuleAccessForUser,
} from "@/app/lib/module-access";
import { getEffectivePermissionBundleCached } from "@/app/db/queries/authz-permissions";
import { resolvePageAction } from "@/app/lib/acx/action-map";
import { isAuthzV2Enabled } from "@/app/lib/acx/feature-flag";

export const dynamic = "force-dynamic";

async function GETHandler(req: NextRequest) {
  try {
    const principal = await requireAuth(req);
    const userRoles = principal.roles || [];
    const position =
      typeof (principal.apt as any)?.position === "string"
        ? String((principal.apt as any).position)
        : null;
    const moduleAccess = await resolveModuleAccessForUser({
      userId: principal.userId,
      roles: userRoles,
      position,
    });
    const authzBundle = isAuthzV2Enabled()
      ? await getEffectivePermissionBundleCached({
          userId: principal.userId,
          roles: userRoles,
          apt: (principal.apt ?? undefined) as any,
        })
      : null;
    const visibleSections = isAuthzV2Enabled()
      ? filterNavigationSectionsForResolvedAccess(
          filterNavigationByPermissions(NAVIGATION_TREE as readonly NavSectionConfig[], {
            roleIsSuperAdmin: authzBundle?.isSuperAdmin ?? false,
            permissions: authzBundle?.permissions ?? [],
            deniedPermissions: authzBundle?.deniedPermissions ?? [],
          }),
          moduleAccess
        ).map((section) => ({
          ...section,
          items: [...section.items],
        }))
      : filterNavigationSectionsForResolvedAccess(
          NAVIGATION_TREE as readonly NavSectionConfig[],
          moduleAccess
        ).map((section) => ({
          ...section,
          items: [...section.items],
        }));

    return NextResponse.json({
      sections: visibleSections,
      generatedAt: new Date().toISOString(),
      userRoleSummary: userRoles,
      moduleAccess: {
        canAccessDossier: moduleAccess.canAccessDossier,
        canAccessBulkUpload: moduleAccess.canAccessBulkUpload,
        canAccessReports: moduleAccess.canAccessReports,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function filterNavigationByPermissions(
  sections: readonly NavSectionConfig[],
  access: {
    roleIsSuperAdmin: boolean;
    permissions: string[];
    deniedPermissions: string[];
  }
) {
  if (access.roleIsSuperAdmin || access.permissions.includes("*")) {
    return sections.map((section) => ({ ...section, items: [...section.items] }));
  }

  const permissions = new Set(access.permissions);
  const denied = new Set(access.deniedPermissions);

  return sections
    .map((section) => {
      const items = section.items.filter((item) => {
        const pageAction = item.url.startsWith("/dashboard")
          ? resolvePageAction(item.url.split("?")[0])?.action ?? null
          : null;
        const candidates = [item.requiredAction ?? null, pageAction].filter(
          (value): value is string => Boolean(value)
        );

        if (candidates.length === 0) return true;
        if (candidates.some((action) => denied.has(action))) return false;
        return candidates.some((action) => permissions.has(action));
      });

      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
}

export const GET = withAuditRoute("GET", GETHandler);
