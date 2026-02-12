export type SidebarRoleGroup = "ADMIN" | "SUPER_ADMIN" | "OTHER_USERS";

export type SidebarSectionKey =
  | "dashboard"
  | "admin"
  | "settings"
  | "academics"
  | "reports"
  | "dossier";

export const SIDEBAR_SECTIONS_BY_ROLE_GROUP: Record<
  Exclude<SidebarRoleGroup, "SUPER_ADMIN">,
  readonly SidebarSectionKey[]
> = {
  ADMIN: ["dashboard", "admin", "settings"],
  OTHER_USERS: ["dashboard", "dossier", "academics", "reports", "settings"],
};

type RoleGroupInput = {
  roles?: string[] | null;
  position?: string | null;
};

function normalizeRole(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function deriveSidebarRoleGroup({
  roles,
  position,
}: RoleGroupInput): SidebarRoleGroup {
  const roleSet = new Set((roles ?? []).map(normalizeRole));
  const normalizedPosition = normalizeRole(position);

  if (normalizedPosition) {
    roleSet.add(normalizedPosition);
  }

  if (roleSet.has("SUPER_ADMIN")) {
    return "SUPER_ADMIN";
  }

  if (roleSet.has("ADMIN")) {
    return "ADMIN";
  }

  return "OTHER_USERS";
}

export function getSidebarSectionsForRoleGroup(
  roleGroup: SidebarRoleGroup
): readonly SidebarSectionKey[] | null {
  if (roleGroup === "SUPER_ADMIN") {
    return null;
  }
  return SIDEBAR_SECTIONS_BY_ROLE_GROUP[roleGroup];
}

export function filterSidebarSectionsForRoleGroup<T extends { key: string }>(
  sections: readonly T[],
  roleGroup: SidebarRoleGroup
): T[] {
  if (roleGroup === "SUPER_ADMIN") {
    return [...sections];
  }

  const sectionByKey = new Map(sections.map((section) => [section.key, section] as const));

  return SIDEBAR_SECTIONS_BY_ROLE_GROUP[roleGroup]
    .map((key) => sectionByKey.get(key))
    .filter((section): section is T => Boolean(section));
}
