import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/app/lib/http";
import { GET, PUT } from "@/app/api/v1/admin/module-access/route";
import { makeJsonRequest } from "../utils/next";

vi.mock("@/app/lib/authz", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("@/app/db/queries/module-access-settings", () => ({
  getOrCreateModuleAccessSettings: vi.fn(),
  updateModuleAccessSettings: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => async (req: any, context: any) => {
    req.audit = { log: vi.fn(async () => undefined) };
    return handler(req, context);
  },
  AuditEventType: {
    API_REQUEST: "api.request",
    USER_UPDATED: "user.updated",
  },
  AuditResourceType: {
    API: "api",
  },
  computeDiff: vi.fn(() => ({
    changedFields: ["adminCanAccessReports"],
    diff: {
      adminCanAccessReports: {
        before: false,
        after: true,
      },
    },
  })),
}));

import { requireSuperAdmin } from "@/app/lib/authz";
import {
  getOrCreateModuleAccessSettings,
  updateModuleAccessSettings,
} from "@/app/db/queries/module-access-settings";

function attachAudit(req: any) {
  req.audit = { log: vi.fn(async () => undefined) };
  return req;
}

describe("admin module access API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireSuperAdmin as any).mockResolvedValue({
      userId: "super-1",
      roles: ["SUPER_ADMIN"],
      claims: { apt: { position: "SUPER_ADMIN" } },
    });
    (getOrCreateModuleAccessSettings as any).mockResolvedValue({
      id: "settings-1",
      singletonKey: "default",
      adminCanAccessDossier: false,
      adminCanAccessBulkUpload: false,
      adminCanAccessReports: false,
      updatedBy: null,
      createdAt: "2026-04-04T00:00:00.000Z",
      updatedAt: "2026-04-04T00:00:00.000Z",
    });
    (updateModuleAccessSettings as any).mockResolvedValue({
      before: {
        adminCanAccessDossier: false,
        adminCanAccessBulkUpload: false,
        adminCanAccessReports: false,
      },
      after: {
        id: "settings-1",
        singletonKey: "default",
        adminCanAccessDossier: true,
        adminCanAccessBulkUpload: false,
        adminCanAccessReports: true,
        updatedBy: "super-1",
        createdAt: "2026-04-04T00:00:00.000Z",
        updatedAt: "2026-04-04T00:10:00.000Z",
      },
    });
  });

  it("GET returns module access settings", async () => {
    const req = attachAudit(
      makeJsonRequest({
        method: "GET",
        path: "/api/v1/admin/module-access",
      })
    );

    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.adminCanAccessDossier).toBe(false);
    expect(getOrCreateModuleAccessSettings).toHaveBeenCalledTimes(1);
  });

  it("PUT updates module access settings", async () => {
    const req = attachAudit(
      makeJsonRequest({
        method: "PUT",
        path: "/api/v1/admin/module-access",
        body: {
          adminCanAccessDossier: true,
          adminCanAccessBulkUpload: false,
          adminCanAccessReports: true,
        },
      })
    );

    const res = await PUT(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.adminCanAccessReports).toBe(true);
    expect(updateModuleAccessSettings).toHaveBeenCalledWith(
      {
        adminCanAccessDossier: true,
        adminCanAccessBulkUpload: false,
        adminCanAccessReports: true,
      },
      "super-1"
    );
  });

  it("returns 403 when super-admin auth fails", async () => {
    (requireSuperAdmin as any).mockRejectedValueOnce(
      new ApiError(403, "Super admin privileges required", "forbidden")
    );

    const req = attachAudit(
      makeJsonRequest({
        method: "GET",
        path: "/api/v1/admin/module-access",
      })
    );

    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });
});
