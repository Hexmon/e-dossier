import { NextRequest, NextResponse } from "next/server";
import { NAVIGATION_TREE, NavSectionConfig } from "@/app/lib/navigation/config";
import { handleApiError } from "@/app/lib/http";
import { requireAuth } from "@/app/lib/guard";
import {
  filterNavigationSectionsForResolvedAccess,
  resolveModuleAccessForUser,
} from "@/app/lib/module-access";

export const dynamic = "force-dynamic";

async function GETHandler(req: NextRequest) {
  try {
    const principal = await requireAuth(req);
    const userRoles = principal.roles || [];
    const moduleAccess = await resolveModuleAccessForUser({
      userId: principal.userId,
      roles: userRoles,
      position:
        typeof (principal.apt as any)?.position === "string"
          ? String((principal.apt as any).position)
          : null,
    });
    const visibleSections = filterNavigationSectionsForResolvedAccess(
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

export const GET = GETHandler;
