import { describe, expect, it } from "vitest";
import {
  deriveSidebarRoleGroup,
  filterSidebarSectionsForRoleGroup,
  getSidebarSectionsForRoleGroup,
  hasSidebarSectionAccess,
  type SidebarSectionKey,
} from "@/lib/sidebar-visibility";

describe("deriveSidebarRoleGroup", () => {
  it("returns SUPER_ADMIN when SUPER_ADMIN is present in roles", () => {
    expect(deriveSidebarRoleGroup({ roles: ["SUPER_ADMIN"], position: "ADMIN" })).toBe(
      "SUPER_ADMIN"
    );
  });

  it("returns SUPER_ADMIN when appointment position is SUPER_ADMIN", () => {
    expect(deriveSidebarRoleGroup({ roles: ["USER"], position: "super admin" })).toBe(
      "SUPER_ADMIN"
    );
  });

  it("returns ADMIN when ADMIN is present and SUPER_ADMIN is absent", () => {
    expect(deriveSidebarRoleGroup({ roles: ["admin"], position: "PLATOON_COMMANDER" })).toBe(
      "ADMIN"
    );
  });

  it("returns OTHER_USERS for non-admin roles", () => {
    expect(
      deriveSidebarRoleGroup({ roles: ["PLATOON_COMMANDER"], position: "PLATOON_COMMANDER" })
    ).toBe("OTHER_USERS");
  });
});

describe("sidebar visibility matrix", () => {
  const sections = [
    { key: "dashboard", label: "Dashboard" },
    { key: "admin", label: "Admin" },
    { key: "settings", label: "Settings" },
    { key: "dossier", label: "Dossier" },
    { key: "bulk_upload", label: "Bulk Upload" },
    { key: "reports", label: "Reports" },
    { key: "help", label: "Help" },
    { key: "extra", label: "Extra" },
  ];

  function sectionKeysFor(group: Parameters<typeof getSidebarSectionsForRoleGroup>[0]) {
    return getSidebarSectionsForRoleGroup(group);
  }

  it("defines ADMIN sections in required order", () => {
    expect(sectionKeysFor("ADMIN")).toEqual(["dashboard", "admin", "settings", "help"]);
  });

  it("uses unrestricted mode for SUPER_ADMIN", () => {
    expect(sectionKeysFor("SUPER_ADMIN")).toBeNull();
  });

  it("defines OTHER_USERS sections in required order", () => {
    expect(sectionKeysFor("OTHER_USERS")).toEqual([
      "dashboard",
      "dossier",
      "bulk_upload",
      "reports",
      "settings",
      "help",
    ]);
  });

  it("filters sections by role group and preserves matrix order", () => {
    const adminVisible = filterSidebarSectionsForRoleGroup(sections, "ADMIN").map(
      (section) => section.key
    );
    const superAdminVisible = filterSidebarSectionsForRoleGroup(sections, "SUPER_ADMIN").map(
      (section) => section.key
    );
    const otherVisible = filterSidebarSectionsForRoleGroup(sections, "OTHER_USERS").map(
      (section) => section.key
    );

    expect(adminVisible).toEqual(["dashboard", "admin", "settings", "help"]);
    expect(superAdminVisible).toEqual([
      "dashboard",
      "admin",
      "settings",
      "dossier",
      "bulk_upload",
      "reports",
      "help",
      "extra",
    ]);
    expect(otherVisible).toEqual([
      "dashboard",
      "dossier",
      "bulk_upload",
      "reports",
      "settings",
      "help",
    ]);
  });

  it("skips missing sections without changing the canonical order", () => {
    const reduced = sections.filter(
      (section) => section.key !== "reports" && section.key !== "admin"
    );

    const visible = filterSidebarSectionsForRoleGroup(reduced, "ADMIN").map(
      (section) => section.key as SidebarSectionKey
    );

    expect(visible).toEqual(["dashboard", "settings", "help"]);
  });

  it("answers section access checks using the same role-group matrix", () => {
    expect(hasSidebarSectionAccess("SUPER_ADMIN", "admin")).toBe(true);
    expect(hasSidebarSectionAccess("ADMIN", "admin")).toBe(true);
    expect(hasSidebarSectionAccess("ADMIN", "reports")).toBe(false);
    expect(hasSidebarSectionAccess("OTHER_USERS", "reports")).toBe(true);
    expect(hasSidebarSectionAccess("OTHER_USERS", "admin")).toBe(false);
  });
});
