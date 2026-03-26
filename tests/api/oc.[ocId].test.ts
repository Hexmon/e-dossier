import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getOcById, PATCH as patchOcById } from "@/app/api/v1/oc/[ocId]/route";
import { ApiError } from "@/app/lib/http";
import * as authz from "@/app/lib/authz";
import { db } from "@/app/db/client";
import { createRouteContext, makeJsonRequest } from "../utils/next";

vi.mock("@/app/lib/authz", async () => {
  const actual = await vi.importActual<typeof import("@/app/lib/authz")>("@/app/lib/authz");
  return {
    ...actual,
    requireAuth: vi.fn(),
  };
});

vi.mock("@/app/db/client", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

const path = "/api/v1/oc";
const ocId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/oc/[ocId]", () => {
  it("returns 401 when authentication fails", async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    const req = makeJsonRequest({ method: "GET", path: `${path}/${ocId}` });
    const ctx = { params: Promise.resolve({ ocId }) } as any;
    const res = await getOcById(req as any, ctx);

    expect(res.status).toBe(401);
  });

  it("returns the OC including jnu enrollment number", async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: "admin-1", roles: ["ADMIN"] });
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
  });
});

describe("PATCH /api/v1/oc/[ocId]", () => {
  it("updates jnu enrollment number for an OC", async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: "admin-1", roles: ["ADMIN"] });
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
  });
});
