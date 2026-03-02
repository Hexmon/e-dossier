import { NextRequest, NextResponse } from "next/server";
import { buildPrincipalFromRequest } from "@/app/lib/acx/principal";
import { NAVIGATION_TREE, NavSectionConfig } from "@/app/lib/navigation/config";
import {
  deriveSidebarRoleGroup,
  getSidebarSectionsForRoleGroup,
  type SidebarSectionKey,
} from "@/lib/sidebar-visibility";
import { handleApiError } from "@/app/lib/http";

export const dynamic = "force-dynamic";

function filterSectionsForRoleGroup(
  sections: readonly NavSectionConfig[],
  roles: string[]
): NavSectionConfig[] {
  const roleGroup = deriveSidebarRoleGroup({
    roles,
    position: null,
  });
  const visibleSectionKeys = getSidebarSectionsForRoleGroup(roleGroup);

  if (!visibleSectionKeys) {
    return sections.map((section) => ({
      ...section,
      items: [...section.items],
    }));
  }

  const sectionByKey = new Map(
    sections.map((section) => [section.key, section] as const)
  );

  return visibleSectionKeys
    .map((key) => sectionByKey.get(key as SidebarSectionKey))
    .filter((section): section is NavSectionConfig => Boolean(section))
    .map((section) => ({
      ...section,
      items: [...section.items],
    }));
}

async function GETHandler(req: NextRequest) {
  try {
    const principal = await buildPrincipalFromRequest(req);
    const userRoles = principal.roles || [];
    const visibleSections = filterSectionsForRoleGroup(NAVIGATION_TREE, userRoles);

    return NextResponse.json({
      sections: visibleSections,
      generatedAt: new Date().toISOString(),
      userRoleSummary: userRoles,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = GETHandler;
