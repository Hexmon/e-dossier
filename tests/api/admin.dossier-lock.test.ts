import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/app/lib/http";
import { GET, PUT } from "@/app/api/v1/admin/dossier-lock/route";
import { makeJsonRequest } from "../utils/next";

vi.mock("@/app/lib/authz", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("@/app/db/queries/dossier-lock-settings", () => ({
  getOrCreateDossierLockSettings: vi.fn(),
  updateDossierLockSettings: vi.fn(),
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
    changedFields: ["lockPolicy"],
    diff: {
      lockPolicy: {
        before: "DEFAULT",
        after: "UNFREEZE_ALL",
      },
    },
  })),
}));

import { requireSuperAdmin } from "@/app/lib/authz";
import {
  getOrCreateDossierLockSettings,
  updateDossierLockSettings,
} from "@/app/db/queries/dossier-lock-settings";

function attachAudit(req: any) {
  req.audit = { log: vi.fn(async () => undefined) };
  return req;
}

describe("admin dossier lock API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireSuperAdmin as any).mockResolvedValue({
      userId: "super-1",
      roles: ["SUPER_ADMIN"],
      claims: { apt: { position: "SUPER_ADMIN" } },
    });
    (getOrCreateDossierLockSettings as any).mockResolvedValue({
      id: "settings-1",
      singletonKey: "default",
      lockPolicy: "DEFAULT",
      updatedBy: null,
      createdAt: "2026-04-25T00:00:00.000Z",
      updatedAt: "2026-04-25T00:00:00.000Z",
    });
    (updateDossierLockSettings as any).mockResolvedValue({
      before: {
        id: "settings-1",
        singletonKey: "default",
        lockPolicy: "DEFAULT",
        updatedBy: null,
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T00:00:00.000Z",
      },
      after: {
        id: "settings-1",
        singletonKey: "default",
        lockPolicy: "UNFREEZE_ALL",
        updatedBy: "super-1",
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T00:10:00.000Z",
      },
    });
  });

  it("GET returns dossier lock settings", async () => {
    const req = attachAudit(
      makeJsonRequest({
        method: "GET",
        path: "/api/v1/admin/dossier-lock",
      })
    );

    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.lockPolicy).toBe("DEFAULT");
    expect(getOrCreateDossierLockSettings).toHaveBeenCalledTimes(1);
  });

  it("PUT updates dossier lock settings", async () => {
    const req = attachAudit(
      makeJsonRequest({
        method: "PUT",
        path: "/api/v1/admin/dossier-lock",
        body: {
          lockPolicy: "UNFREEZE_ALL",
        },
      })
    );

    const res = await PUT(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.settings.lockPolicy).toBe("UNFREEZE_ALL");
    expect(updateDossierLockSettings).toHaveBeenCalledWith(
      {
        lockPolicy: "UNFREEZE_ALL",
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
        path: "/api/v1/admin/dossier-lock",
      })
    );

    const res = await GET(req as any, { params: Promise.resolve({}) } as any);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });
});
