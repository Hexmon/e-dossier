// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

const mockState = vi.hoisted(() => ({
  setRoleMappings: vi.fn(async () => undefined),
  setPositionMappings: vi.fn(async () => undefined),
  searchUsers: vi.fn(async () => [
    {
      id: "user-1",
      username: "admin",
      name: "Admin User",
      rank: "MAJ",
      activeAppointments: [
        {
          id: "apt-1",
          positionId: "pos-admin",
          positionKey: "ADMIN",
          positionName: "Admin",
          scopeType: "GLOBAL",
          scopeId: null,
          startsAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
  ]),
  getEffectivePermissions: vi.fn(async () => ({
    message: "Effective RBAC permissions resolved",
    bundle: {
      userId: "user-1",
      roles: ["ADMIN"],
      appointment: {
        appointmentId: "apt-1",
        positionId: "pos-1",
        positionKey: "ADMIN",
        scopeType: "GLOBAL",
        scopeId: null,
      },
      isAdmin: true,
      isSuperAdmin: false,
      permissions: ["admin:rbac:mappings:read", "page:dashboard:genmgmt:rbac:view"],
      deniedPermissions: ["admin:users:delete"],
      fieldRulesByAction: {
        "admin:users:read": [{ mode: "MASK", fields: ["phone"] }],
      },
      policyVersion: 2,
    },
  })),
}));

vi.mock("@/hooks/useRbacPermissions", () => ({
  useRbacPermissions: () => ({
    data: [
      {
        id: "perm-view-rbac",
        key: "page:dashboard:genmgmt:rbac:view",
        description: "View RBAC page",
        system: true,
        defaultGrant: true,
        display: {
          title: "View RBAC page",
          moduleLabel: "Dashboard",
          areaLabel: "Gen Mgmt",
          actionLabel: "View",
          description: "View RBAC page",
        },
      },
      {
        id: "perm-read-mappings",
        key: "admin:rbac:mappings:read",
        description: "Read RBAC mappings",
        system: true,
        defaultGrant: true,
        display: {
          title: "Read RBAC mappings",
          moduleLabel: "Admin",
          areaLabel: "RBAC",
          actionLabel: "Read",
          description: "Read RBAC mappings",
        },
      },
      {
        id: "perm-create-users",
        key: "admin:users:create",
        description: "Create users",
        system: true,
        defaultGrant: false,
        display: {
          title: "Create users",
          moduleLabel: "Admin",
          areaLabel: "Users",
          actionLabel: "Create",
          description: "Create users",
        },
      },
    ],
    loadedCount: 3,
    total: 560,
    createPermission: { mutateAsync: vi.fn(), isPending: false },
    deletePermission: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock("@/hooks/useRbacMappings", () => ({
  useRbacMappings: () => ({
    mappings: {
      data: {
        roles: [{ id: "role-admin", key: "admin", description: "Admin" }],
        positions: [{ id: "pos-admin", key: "ADMIN", displayName: "Admin" }],
        roleMappings: [
          {
            roleId: "role-admin",
            roleKey: "admin",
            permissionId: "perm-view-rbac",
            permissionKey: "page:dashboard:genmgmt:rbac:view",
          },
          {
            roleId: "role-admin",
            roleKey: "admin",
            permissionId: "perm-create-users",
            permissionKey: "admin:users:create",
          },
        ],
        positionMappings: [
          {
            positionId: "pos-admin",
            positionKey: "ADMIN",
            permissionId: "perm-view-rbac",
            permissionKey: "page:dashboard:genmgmt:rbac:view",
          },
          {
            positionId: "pos-admin",
            positionKey: "ADMIN",
            permissionId: "perm-create-users",
            permissionKey: "admin:users:create",
          },
        ],
        defaults: {
          defaultProfiles: [
            {
              key: "admin",
              label: "Admin",
              roleKeys: ["admin"],
              positionKeys: ["ADMIN"],
              permissionKeys: [
                "page:dashboard:genmgmt:rbac:view",
                "admin:rbac:mappings:read",
              ],
            },
          ],
          defaultRoleMappings: [
            {
              profileKey: "admin",
              roleId: "role-admin",
              roleKey: "admin",
              permissionId: "perm-view-rbac",
              permissionKey: "page:dashboard:genmgmt:rbac:view",
            },
            {
              profileKey: "admin",
              roleId: "role-admin",
              roleKey: "admin",
              permissionId: "perm-read-mappings",
              permissionKey: "admin:rbac:mappings:read",
            },
          ],
          defaultPositionMappings: [
            {
              profileKey: "admin",
              positionId: "pos-admin",
              positionKey: "ADMIN",
              permissionId: "perm-view-rbac",
              permissionKey: "page:dashboard:genmgmt:rbac:view",
            },
            {
              profileKey: "admin",
              positionId: "pos-admin",
              positionKey: "ADMIN",
              permissionId: "perm-read-mappings",
              permissionKey: "admin:rbac:mappings:read",
            },
          ],
          permissionMeta: [],
        },
      },
    },
    rolesAndPositions: {
      data: {
        roles: [{ id: "role-admin", key: "admin", description: "Admin" }],
        positions: [{ id: "pos-admin", key: "ADMIN", displayName: "Admin" }],
      },
    },
    setRoleMappings: {
      mutateAsync: mockState.setRoleMappings,
      isPending: false,
    },
    setPositionMappings: {
      mutateAsync: mockState.setPositionMappings,
      isPending: false,
    },
  }),
}));

vi.mock("@/hooks/useRbacRoles", () => ({
  useRbacRoles: () => ({
    createRole: { mutateAsync: vi.fn(), isPending: false },
    deleteRole: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock("@/hooks/useRbacFieldRules", () => ({
  useRbacFieldRules: () => ({
    data: [
      {
        id: "rule-1",
        permissionId: "perm-read-mappings",
        permissionKey: "admin:rbac:mappings:read",
        positionId: "pos-admin",
        positionKey: "ADMIN",
        roleId: null,
        roleKey: null,
        mode: "OMIT",
        fields: ["phone"],
        note: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        defaultRule: false,
        customRule: true,
      },
    ],
    defaults: {
      defaultFieldRules: [],
      missingDefaultFieldRules: [],
    },
    createRule: { mutateAsync: vi.fn(), isPending: false },
    deleteRule: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock("@/app/lib/api/userApi", () => ({
  searchUsers: mockState.searchUsers,
}));

vi.mock("@/app/lib/api/rbacApi", () => ({
  rbacApi: {
    getEffectivePermissions: mockState.getEffectivePermissions,
  },
}));

import RbacManagement from "@/components/genmgmt/rbac/RbacManagement";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function getButton(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(text)
  );
  expect(button, `button containing "${text}"`).toBeTruthy();
  return button as HTMLButtonElement;
}

function getInput(container: HTMLElement, placeholder: string) {
  const input = Array.from(container.querySelectorAll("input")).find(
    (item) => item.placeholder === placeholder
  );
  expect(input, `input with placeholder "${placeholder}"`).toBeTruthy();
  return input as HTMLInputElement;
}

function getSelectWithOption(container: HTMLElement, optionText: string) {
  const select = Array.from(container.querySelectorAll("select")).find((item) =>
    Array.from(item.options).some((option) => option.textContent?.includes(optionText))
  );
  expect(select, `select with option "${optionText}"`).toBeTruthy();
  return select as HTMLSelectElement;
}

function getSelectsWithOption(container: HTMLElement, optionText: string) {
  return Array.from(container.querySelectorAll("select")).filter((item) =>
    Array.from(item.options).some((option) => option.textContent?.includes(optionText))
  ) as HTMLSelectElement[];
}

async function click(button: HTMLButtonElement) {
  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(input, "value")?.set;
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(input, value);
  } else {
    valueSetter?.call(input, value);
  }

  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("RbacManagement", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it("shows default mapping status and applies defaults through the position mapping API", async () => {
    act(() => {
      root.render(<RbacManagement />);
    });

    const positionSelect = getSelectWithOption(container, "Admin");
    act(() => {
      positionSelect.value = "pos-admin";
      positionSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(container.textContent).toContain("Grants 2 | Defaults 2 | Missing 1 | Custom 1 | Field rules 1");
    expect(container.textContent).toContain("Applied default");
    expect(container.textContent).toContain("Missing default");
    expect(container.textContent).toContain("Custom grant");
    expect(container.textContent).toContain("Admin default");
    expect(container.textContent).toContain("System");
    expect(container.textContent).toContain("Default grant");
    expect(container.textContent).toContain("Loaded 3 permissions / 560 total");
    expect(container.textContent).toContain("Default rules: 0");
    expect(container.textContent).toContain("Custom rules: 1");
    expect(container.textContent).toContain("No default field rules defined");
    expect(getButton(container, "System managed").disabled).toBe(true);

    await click(getButton(container, "Apply defaults"));

    expect(mockState.setPositionMappings).toHaveBeenCalledWith({
      positionId: "pos-admin",
      permissionIds: ["perm-view-rbac", "perm-read-mappings"],
    });
  });

  it("keeps advanced role mappings available", () => {
    act(() => {
      root.render(<RbacManagement />);
    });

    const adminSelects = getSelectsWithOption(container, "Admin");
    const advancedRoleSelect = adminSelects[1];
    expect(container.textContent).toContain("Advanced Role Mapping");

    act(() => {
      advancedRoleSelect.value = "role-admin";
      advancedRoleSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(container.textContent).toContain("Advanced Role Mapping: Admin");
  });

  it("links searched users to appointment position mappings", async () => {
    act(() => {
      root.render(<RbacManagement />);
    });

    act(() => {
      const searchInput = getInput(container, "Search user by name, username, or email");
      setInputValue(searchInput, "admin");
    });

    await click(getButton(container, "Search Users"));

    const userSelect = getSelectWithOption(container, "Admin User");
    act(() => {
      userSelect.value = "user-1";
      userSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const appointmentSelect = getSelectWithOption(container, "Admin | GLOBAL");
    act(() => {
      appointmentSelect.value = "apt-1";
      appointmentSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(mockState.searchUsers).toHaveBeenCalledWith("admin", undefined, 20);
    expect(container.textContent).toContain("Appointment Position Mapping: Admin");
    expect(container.textContent).toContain("Auto-selected position mapping: Admin");

    await click(getButton(container, "Preview Selected Access"));

    expect(mockState.getEffectivePermissions).toHaveBeenCalledWith({
      userId: "user-1",
      appointmentId: "apt-1",
    });
  });

  it("previews user effective access with roles, scope, grants, denials, and field rules", async () => {
    act(() => {
      root.render(<RbacManagement />);
    });

    await click(getButton(container, "Advanced manual IDs"));

    act(() => {
      const userInput = getInput(container, "User ID (blank = current user)");
      setInputValue(userInput, "user-1");

      const appointmentInput = getInput(container, "Appointment ID (optional)");
      setInputValue(appointmentInput, "apt-1");
    });

    await click(getButton(container, "Preview"));

    expect(mockState.getEffectivePermissions).toHaveBeenCalledWith({
      userId: "user-1",
      appointmentId: "apt-1",
    });
    expect(container.textContent).toContain("User: user-1");
    expect(container.textContent).toContain("Position: ADMIN");
    expect(container.textContent).toContain("Scope: GLOBAL");
    expect(container.textContent).toContain("ADMIN");
    expect(container.textContent).toContain("admin:rbac:mappings:read");
    expect(container.textContent).toContain("admin:users:delete");
    expect(container.textContent).toContain("admin:users:read");
  });
});
