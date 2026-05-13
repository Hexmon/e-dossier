import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as deleteOcById, GET as getOcById, PATCH as patchOcById } from "@/app/api/v1/oc/[ocId]/route";
import { ApiError } from "@/app/lib/http";
import * as authz from "@/app/lib/authz";
import * as ocChecks from "@/app/api/v1/oc/_checks";
import * as ocEnrollmentQueries from "@/app/db/queries/oc-enrollments";
import * as ocLifecycle from "@/app/db/queries/oc-lifecycle";
import { db } from "@/app/db/client";
import { createRouteContext, makeJsonRequest } from "../utils/next";

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/app/lib/authz", async () => {
  return {
    requireAuth: vi.fn(),
    requireAdmin: vi.fn(),
  };
});

vi.mock("@/app/api/v1/oc/_checks", () => ({
  mustHaveOcAccess: vi.fn(),
}));

vi.mock("@/app/db/client", () => ({
  db: dbMock,
}));

vi.mock("@/app/db/queries/oc-enrollments", () => ({
  getCurrentSemesterForOc: vi.fn(),
}));

vi.mock("@/app/db/queries/oc-lifecycle", () => ({
  syncOcLifecycleFromCadet: vi.fn(),
}));

const path = "/api/v1/oc";
const ocId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  (db.transaction as any).mockImplementation((callback: any) => callback(db));
});

describe("GET /api/v1/oc/[ocId]", () => {
  it("returns 401 when authentication fails", async () => {
    (ocChecks.mustHaveOcAccess as any).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    const req = makeJsonRequest({ method: "GET", path: `${path}/${ocId}` });
    const ctx = { params: Promise.resolve({ ocId }) } as any;
    const res = await getOcById(req as any, ctx);

    expect(res.status).toBe(401);
  });

  it("returns 403 when the OC is outside the caller scope", async () => {
    (ocChecks.mustHaveOcAccess as any).mockRejectedValueOnce(
      new ApiError(403, "Not authorized to access this OC record", "forbidden")
    );

    const req = makeJsonRequest({ method: "GET", path: `${path}/${ocId}` });
    const ctx = { params: Promise.resolve({ ocId }) } as any;
    const res = await getOcById(req as any, ctx);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("forbidden");
  });

  it("returns the OC including jnu enrollment number", async () => {
    (ocChecks.mustHaveOcAccess as any).mockResolvedValueOnce({ userId: "pc-1", roles: ["PLATOON_COMMANDER"] });
    (ocEnrollmentQueries.getCurrentSemesterForOc as any).mockResolvedValueOnce(4);
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        leftJoin: () => ({
          leftJoin: () => ({
            where: () => ({
              limit: async () => [{
                id: ocId,
                ocNo: "OC-001",
                jnuEnrollmentNo: "001",
                uid: "UID-1",
                name: "OC One",
                branch: "O",
                arrivalAtUniversity: new Date("2026-03-01T00:00:00Z"),
                status: "ACTIVE",
                managerUserId: null,
                relegatedToCourseId: null,
                relegatedOn: null,
                withdrawnOn: null,
                createdAt: new Date("2026-03-01T00:00:00Z"),
                updatedAt: new Date("2026-03-02T00:00:00Z"),
                courseId: "course-1",
                courseCode: "C-1",
                courseTitle: "Course One",
                courseNotes: null,
                courseCreatedAt: new Date("2026-01-01T00:00:00Z"),
                courseUpdatedAt: new Date("2026-01-02T00:00:00Z"),
                courseDeletedAt: null,
                platoonId: "platoon-1",
                platoonKey: "A",
                platoonName: "Alpha",
                platoonAbout: null,
                platoonCreatedAt: new Date("2026-01-01T00:00:00Z"),
                platoonUpdatedAt: new Date("2026-01-02T00:00:00Z"),
                platoonDeletedAt: null,
              }],
            }),
          }),
        }),
      }),
    }));

    const req = makeJsonRequest({ method: "GET", path: `${path}/${ocId}` });
    const ctx = { params: Promise.resolve({ ocId }) } as any;
    const res = await getOcById(req as any, ctx);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.oc.jnuEnrollmentNo).toBe("001");
    expect(body.oc.currentSemester).toBe(4);
  });
});

describe("PATCH /api/v1/oc/[ocId]", () => {
  it("updates jnu enrollment number for an OC", async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({ userId: "admin-1", roles: ["ADMIN"] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: ocId, name: "OC One" }],
        }),
      }),
    }));
    (db.update as any).mockImplementationOnce(() => ({
      set: (payload: any) => ({
        where: () => ({
          returning: async () => [{ id: ocId, jnuEnrollmentNo: payload.jnuEnrollmentNo }],
        }),
      }),
    }));

    const req = makeJsonRequest({
      method: "PATCH",
      path: `${path}/${ocId}`,
      body: { jnuEnrollmentNo: "001" },
    });
    const ctx = { params: Promise.resolve({ ocId }) } as any;
    const res = await patchOcById(req as any, ctx);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.oc.jnuEnrollmentNo).toBe("001");
    expect(ocLifecycle.syncOcLifecycleFromCadet).not.toHaveBeenCalled();
  });

  it("syncs lifecycle compatibility rows when placement fields change", async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({ userId: "admin-1", roles: ["ADMIN"] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: ocId, name: "OC One" }],
        }),
      }),
    }));
    (db.update as any).mockImplementationOnce(() => ({
      set: (payload: any) => ({
        where: () => ({
          returning: async () => [{ id: ocId, courseId: payload.courseId }],
        }),
      }),
    }));

    const req = makeJsonRequest({
      method: "PATCH",
      path: `${path}/${ocId}`,
      body: { courseId: "22222222-2222-4222-8222-222222222222" },
    });
    const ctx = { params: Promise.resolve({ ocId }) } as any;
    const res = await patchOcById(req as any, ctx);

    expect(res.status).toBe(200);
    expect(ocLifecycle.syncOcLifecycleFromCadet).toHaveBeenCalledWith(ocId, {
      actorUserId: "admin-1",
      reason: "oc_patch_canonical_sync",
    });
  });

  it("upserts imported personal fields when editing an OC", async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({ userId: "admin-1", roles: ["ADMIN"] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: ocId, name: "OC One" }],
        }),
      }),
    }));
    (db.update as any).mockImplementationOnce(() => ({
      set: (payload: any) => ({
        where: () => ({
          returning: async () => [{ id: ocId, name: payload.name }],
        }),
      }),
    }));
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    (db.insert as any).mockImplementationOnce(() => ({
      values: (payload: any) => ({
        onConflictDoUpdate: (config: any) => onConflictDoUpdate({ payload, config }),
      }),
    }));

    const req = makeJsonRequest({
      method: "PATCH",
      path: `${path}/${ocId}`,
      body: {
        name: "OC One Edited",
        personal: {
          email: "edited@example.com",
          panNo: "ABCDE1234F",
          fatherName: "Father Name",
          games: "Football",
          swimmer: true,
        },
      },
    });
    const ctx = { params: Promise.resolve({ ocId }) } as any;
    const res = await patchOcById(req as any, ctx);

    expect(res.status).toBe(200);
    expect(onConflictDoUpdate).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        ocId,
        email: "edited@example.com",
        panNo: "ABCDE1234F",
        fatherName: "Father Name",
        games: "Football",
        swimmer: true,
      }),
      config: expect.objectContaining({
        set: expect.objectContaining({
          email: "edited@example.com",
          panNo: "ABCDE1234F",
        }),
      }),
    }));
  });
});

describe("DELETE /api/v1/oc/[ocId]", () => {
  it("archives an OC instead of hard deleting it", async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({ userId: "admin-1", roles: ["ADMIN"] });
    (db.update as any).mockImplementationOnce(() => ({
      set: (payload: any) => ({
        where: () => ({
          returning: async () => [
            {
              id: ocId,
              status: payload.status,
              deletedAt: payload.deletedAt,
            },
          ],
        }),
      }),
    }));

    const req = makeJsonRequest({
      method: "DELETE",
      path: `${path}/${ocId}`,
    });
    const ctx = { params: Promise.resolve({ ocId }) } as any;
    const res = await deleteOcById(req as any, ctx);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.archived).toBe(true);
    expect(body.message).toBe("OC archived successfully.");
  });
});
