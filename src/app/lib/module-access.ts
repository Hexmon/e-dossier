import { ApiError } from "@/app/lib/http";
import {
  DEFAULT_MODULE_ACCESS_SETTINGS,
  getModuleAccessSettingsOrDefault,
  type ModuleAccessSettingsRecord,
} from "@/app/db/queries/module-access-settings";
import type { MarksWorkflowModule } from "@/app/lib/marks-review-workflow";
import {
  listMarksWorkflowAssignmentsForUser,
} from "@/app/services/marksReviewWorkflow";
import {
  deriveSidebarRoleGroup,
  type SidebarRoleGroup,
  type SidebarSectionKey,
} from "@/lib/sidebar-visibility";

export type ModuleAccessKey = "DOSSIER" | "BULK_UPLOAD" | "REPORTS";

export type ModuleAccessSettings = Pick<
  ModuleAccessSettingsRecord,
  "adminCanAccessDossier" | "adminCanAccessBulkUpload" | "adminCanAccessReports"
>;

export type WorkflowAssignment = {
  module: MarksWorkflowModule;
  actorTypes: string[];
};

export type ModuleAccessPrincipal = {
  userId: string;
  roles?: string[] | null;
  position?: string | null;
  workflowAssignments?: WorkflowAssignment[] | null;
};

export type ResolvedModuleAccess = {
  roleGroup: SidebarRoleGroup;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  settings: ModuleAccessSettings;
  workflowAssignments: WorkflowAssignment[];
  canAccessDossier: boolean;
  canAccessReports: boolean;
  canAccessBulkUpload: boolean;
  canAccessAcademicsBulk: boolean;
  canAccessPtBulk: boolean;
  sections: Record<SidebarSectionKey, boolean>;
};

type ModuleApiRequirement =
  | { module: "REPORTS" }
  | { module: "DOSSIER" }
  | { module: "BULK_UPLOAD"; workflowModule: MarksWorkflowModule | null };

const UUID_SEGMENT = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const DOSSIER_OC_CHILD_ROUTE_PATTERN = new RegExp(`^/api/v1/oc/${UUID_SEGMENT}/.+$`, "i");

export const MODULE_ACCESS_DEFAULTS: ModuleAccessSettings = {
  adminCanAccessDossier: DEFAULT_MODULE_ACCESS_SETTINGS.adminCanAccessDossier,
  adminCanAccessBulkUpload: DEFAULT_MODULE_ACCESS_SETTINGS.adminCanAccessBulkUpload,
  adminCanAccessReports: DEFAULT_MODULE_ACCESS_SETTINGS.adminCanAccessReports,
};

function normalizeSettingsRecord(
  record: Pick<
    ModuleAccessSettingsRecord,
    "adminCanAccessDossier" | "adminCanAccessBulkUpload" | "adminCanAccessReports"
  > | null
): ModuleAccessSettings {
  return {
    adminCanAccessDossier: record?.adminCanAccessDossier ?? MODULE_ACCESS_DEFAULTS.adminCanAccessDossier,
    adminCanAccessBulkUpload:
      record?.adminCanAccessBulkUpload ?? MODULE_ACCESS_DEFAULTS.adminCanAccessBulkUpload,
    adminCanAccessReports: record?.adminCanAccessReports ?? MODULE_ACCESS_DEFAULTS.adminCanAccessReports,
  };
}

function hasWorkflowAssignment(
  assignments: WorkflowAssignment[],
  module: MarksWorkflowModule
): boolean {
  return assignments.some(
    (assignment) => assignment.module === module && assignment.actorTypes.length > 0
  );
}

export function buildSectionAccessMap(
  roleGroup: SidebarRoleGroup,
  options: {
    canAccessDossier: boolean;
    canAccessBulkUpload: boolean;
    canAccessReports: boolean;
  }
): Record<SidebarSectionKey, boolean> {
  return {
    dashboard: true,
    admin: roleGroup === "ADMIN" || roleGroup === "SUPER_ADMIN",
    settings: true,
    dossier: roleGroup === "SUPER_ADMIN" ? true : options.canAccessDossier,
    bulk_upload: roleGroup === "SUPER_ADMIN" ? true : options.canAccessBulkUpload,
    reports: roleGroup === "SUPER_ADMIN" ? true : options.canAccessReports,
    help: true,
  };
}

export async function resolveModuleAccessForUser(
  principal: ModuleAccessPrincipal
): Promise<ResolvedModuleAccess> {
  const roleGroup = deriveSidebarRoleGroup({
    roles: principal.roles,
    position: principal.position,
  });
  const isSuperAdmin = roleGroup === "SUPER_ADMIN";
  const isAdmin = roleGroup === "ADMIN" || isSuperAdmin;

  const settings = normalizeSettingsRecord(
    isAdmin ? await getModuleAccessSettingsOrDefault() : null
  );

  const workflowAssignments =
    principal.workflowAssignments != null
      ? principal.workflowAssignments
      : roleGroup === "ADMIN"
        ? await listMarksWorkflowAssignmentsForUser({
            userId: principal.userId,
            roles: principal.roles ?? [],
          })
        : [];

  if (isSuperAdmin) {
    return {
      roleGroup,
      isAdmin,
      isSuperAdmin,
      settings,
      workflowAssignments,
      canAccessDossier: true,
      canAccessReports: true,
      canAccessBulkUpload: true,
      canAccessAcademicsBulk: true,
      canAccessPtBulk: true,
      sections: buildSectionAccessMap(roleGroup, {
        canAccessDossier: true,
        canAccessBulkUpload: true,
        canAccessReports: true,
      }),
    };
  }

  if (roleGroup === "ADMIN") {
    const canAccessAcademicsBulk =
      settings.adminCanAccessBulkUpload ||
      hasWorkflowAssignment(workflowAssignments, "ACADEMICS_BULK");
    const canAccessPtBulk =
      settings.adminCanAccessBulkUpload || hasWorkflowAssignment(workflowAssignments, "PT_BULK");
    const canAccessBulkUpload = canAccessAcademicsBulk || canAccessPtBulk;

    return {
      roleGroup,
      isAdmin,
      isSuperAdmin,
      settings,
      workflowAssignments,
      canAccessDossier: settings.adminCanAccessDossier,
      canAccessReports: settings.adminCanAccessReports,
      canAccessBulkUpload,
      canAccessAcademicsBulk,
      canAccessPtBulk,
      sections: buildSectionAccessMap(roleGroup, {
        canAccessDossier: settings.adminCanAccessDossier,
        canAccessBulkUpload,
        canAccessReports: settings.adminCanAccessReports,
      }),
    };
  }

  return {
    roleGroup,
    isAdmin,
    isSuperAdmin,
    settings,
    workflowAssignments,
    canAccessDossier: true,
    canAccessReports: true,
    canAccessBulkUpload: true,
    canAccessAcademicsBulk: true,
    canAccessPtBulk: true,
    sections: buildSectionAccessMap(roleGroup, {
      canAccessDossier: true,
      canAccessBulkUpload: true,
      canAccessReports: true,
    }),
  };
}

export function filterNavigationSectionsForResolvedAccess<T extends { key: string }>(
  sections: readonly T[],
  access: Pick<ResolvedModuleAccess, "sections">
): T[] {
  return sections.filter((section) =>
    access.sections[section.key as SidebarSectionKey] ?? false
  );
}

export function hasResolvedSectionAccess(
  access: Pick<ResolvedModuleAccess, "sections">,
  sectionKey: SidebarSectionKey
) {
  return access.sections[sectionKey];
}

export function canAccessModule(
  access: Pick<
    ResolvedModuleAccess,
    "canAccessDossier" | "canAccessBulkUpload" | "canAccessReports"
  >,
  module: ModuleAccessKey
) {
  if (module === "DOSSIER") return access.canAccessDossier;
  if (module === "BULK_UPLOAD") return access.canAccessBulkUpload;
  return access.canAccessReports;
}

export function canAccessBulkWorkflowModule(
  access: Pick<ResolvedModuleAccess, "canAccessAcademicsBulk" | "canAccessPtBulk">,
  module: MarksWorkflowModule
) {
  return module === "ACADEMICS_BULK"
    ? access.canAccessAcademicsBulk
    : access.canAccessPtBulk;
}

export function resolveModuleRequirementForApiPath(
  pathname: string
): ModuleApiRequirement | null {
  if (pathname === "/api/v1/oc/academics/bulk") {
    return { module: "BULK_UPLOAD", workflowModule: "ACADEMICS_BULK" };
  }

  if (pathname === "/api/v1/oc/academics/workflow") {
    return { module: "BULK_UPLOAD", workflowModule: "ACADEMICS_BULK" };
  }

  if (pathname === "/api/v1/oc/physical-training/bulk") {
    return { module: "BULK_UPLOAD", workflowModule: "PT_BULK" };
  }

  if (pathname === "/api/v1/oc/physical-training/workflow") {
    return { module: "BULK_UPLOAD", workflowModule: "PT_BULK" };
  }

  if (pathname === "/api/v1/reports" || pathname.startsWith("/api/v1/reports/")) {
    return { module: "REPORTS" };
  }

  if (DOSSIER_OC_CHILD_ROUTE_PATTERN.test(pathname)) {
    return { module: "DOSSIER" };
  }

  return null;
}

export async function assertModuleApiAccessByPath(
  pathname: string,
  principal: ModuleAccessPrincipal
) {
  const requirement = resolveModuleRequirementForApiPath(pathname);
  if (!requirement) return;

  const access = await resolveModuleAccessForUser(principal);
  if (!access.isAdmin || access.isSuperAdmin) {
    return;
  }

  if (requirement.module === "BULK_UPLOAD") {
    const allowed =
      requirement.workflowModule == null
        ? access.canAccessBulkUpload
        : canAccessBulkWorkflowModule(access, requirement.workflowModule);

    if (!allowed) {
      throw new ApiError(
        403,
        "Bulk Upload access is disabled for ADMIN by module access settings.",
        "module_access_denied",
        { module: requirement.module, path: pathname }
      );
    }
    return;
  }

  if (!canAccessModule(access, requirement.module)) {
    throw new ApiError(
      403,
      `${requirement.module.replace(/_/g, " ")} access is disabled for ADMIN by module access settings.`,
      "module_access_denied",
      { module: requirement.module, path: pathname }
    );
  }
}
