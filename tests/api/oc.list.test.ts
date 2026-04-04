import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getOcList } from "@/app/api/v1/oc/route";
import { ApiError } from "@/app/lib/http";
import * as authz from "@/app/lib/authz";
import * as ocQueries from "@/app/db/queries/oc";
import { db } from "@/app/db/client";
import { createRouteContext, makeJsonRequest } from "../utils/next";

vi.mock("@/app/lib/authz", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/app/db/queries/oc", () => ({
  listOCsBasic: vi.fn(async () => []),
  listOCsFull: vi.fn(async () => []),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

const path = "/api/v1/oc";
const scopedPlatoonId = "11111111-1111-4111-8111-111111111111";
const otherPlatoonId = "22222222-2222-4222-8222-222222222222";
const selectedOcId = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/oc", () => {
  it("returns 401 when authentication fails", async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    const req = makeJsonRequest({ method: "GET", path });
    const res = await getOcList(req as any, createRouteContext());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("unauthorized");
  });

  it("returns 400 when platoon scoped user is missing scope id", async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
      userId: "u-1",
      roles: ["PLATOON_COMMANDER"],
      claims: { apt: { scope: { type: "PLATOON", id: null } } },
    });

    const req = makeJsonRequest({ method: "GET", path });
    const res = await getOcList(req as any, createRouteContext());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.message).toContain("missing platoon scope id");
  });

  it("returns 403 when platoon scoped user passes another platoon", async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
      userId: "u-1",
      roles: ["PLATOON_COMMANDER"],
      claims: { apt: { scope: { type: "PLATOON", id: scopedPlatoonId } } },
    });

    const req = makeJsonRequest({
      method: "GET",
      path: `${path}?platoon=${otherPlatoonId}`,
    });
    const res = await getOcList(req as any, createRouteContext());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("forbidden");
  });

  it("forces own platoon for scoped users when platoon query is omitted", async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
      userId: "u-1",
      roles: ["PLATOON_COMMANDER"],
      claims: { apt: { scope: { type: "PLATOON", id: scopedPlatoonId } } },
    });
    (ocQueries.listOCsBasic as any).mockResolvedValueOnce([]);

    const req = makeJsonRequest({
      method: "GET",
      path: `${path}?active=true&limit=20`,
    });
    const res = await getOcList(req as any, createRouteContext());

    expect(res.status).toBe(200);
    expect(ocQueries.listOCsBasic).toHaveBeenCalledWith(
      expect.objectContaining({
        platoonId: scopedPlatoonId,
        active: true,
        limit: 20,
      })
    );
  });

  it("supports query alias and sort mapping", async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: { apt: { scope: { type: "GLOBAL", id: null } } },
    });
    (ocQueries.listOCsBasic as any).mockResolvedValueOnce([]);

    const req = makeJsonRequest({
      method: "GET",
      path: `${path}?query=rahul&sort=name_asc`,
    });
    const res = await getOcList(req as any, createRouteContext());

    expect(res.status).toBe(200);
    expect(ocQueries.listOCsBasic).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "rahul",
        sort: "name_asc",
      })
    );
  });

  it("returns current semester from the OC list payload", async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: { apt: { scope: { type: "GLOBAL", id: null } } },
    });
    (ocQueries.listOCsBasic as any).mockResolvedValueOnce([
      { id: selectedOcId, name: "Selected OC", currentSemester: 3 },
    ]);

    const req = makeJsonRequest({
      method: "GET",
      path,
    });
    const res = await getOcList(req as any, createRouteContext());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].currentSemester).toBe(3);
  });

  it("caps limit to 1000", async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: { apt: { scope: { type: "GLOBAL", id: null } } },
    });
    (ocQueries.listOCsBasic as any).mockResolvedValueOnce([]);

    const req = makeJsonRequest({
      method: "GET",
      path: `${path}?limit=5000`,
    });
    const res = await getOcList(req as any, createRouteContext());

    expect(res.status).toBe(200);
    expect(ocQueries.listOCsBasic).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 1000,
      })
    );
  });

  it("supports platoon key filtering for global users", async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: { apt: { scope: { type: "GLOBAL", id: null } } },
    });
    (ocQueries.listOCsBasic as any).mockResolvedValueOnce([]);

    const req = makeJsonRequest({
      method: "GET",
      path: `${path}?platoon=alpha&active=true`,
    });
    const res = await getOcList(req as any, createRouteContext());

    expect(res.status).toBe(200);
    expect(ocQueries.listOCsBasic).toHaveBeenCalledWith(
      expect.objectContaining({
        platoonKey: "ALPHA",
        active: true,
      })
    );
  });

  it("passes the selected oc id to the full query when requesting one OC", async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: { apt: { scope: { type: "GLOBAL", id: null } } },
    });
    (ocQueries.listOCsFull as any).mockResolvedValueOnce([
      { id: selectedOcId, name: "Selected OC" },
    ]);

    const req = makeJsonRequest({
      method: "GET",
      path: `${path}?id=${selectedOcId}&full=true&limit=1`,
    });
    const res = await getOcList(req as any, createRouteContext());

    expect(res.status).toBe(200);
    expect(ocQueries.listOCsFull).toHaveBeenCalledWith(
      expect.objectContaining({
        id: selectedOcId,
        limit: 1,
      })
    );
  });

  it("returns 400 for invalid sort", async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: { apt: { scope: { type: "GLOBAL", id: null } } },
    });

    const req = makeJsonRequest({
      method: "GET",
      path: `${path}?sort=invalid`,
    });
    const res = await getOcList(req as any, createRouteContext());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("bad_request");
  });
});

describe("POST /api/v1/oc", () => {
  it("creates an OC with jnu enrollment number", async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: { apt: { scope: { type: "GLOBAL", id: null } } },
    });
    (db.select as any)
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: "course-1", deletedAt: null }],
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: "platoon-1", deletedAt: null }],
          }),
        }),
      }));
    (db.insert as any).mockImplementationOnce(() => ({
      values: (payload: any) => ({
        returning: async () => [{
          id: "oc-1",
          name: payload.name,
          ocNo: payload.ocNo,
          jnuEnrollmentNo: payload.jnuEnrollmentNo,
          uid: payload.uid,
          courseId: payload.courseId,
          branch: payload.branch,
          platoonId: payload.platoonId,
          arrivalAtUniversity: payload.arrivalAtUniversity,
          withdrawnOn: null,
          createdAt: new Date("2026-03-23T00:00:00Z"),
        }],
      }),
    }));

    const req = makeJsonRequest({
      method: "POST",
      path,
      body: {
        name: "OC One",
        ocNo: "OC-001",
        jnuEnrollmentNo: "001",
        courseId: "11111111-1111-4111-8111-111111111111",
        platoonId: "22222222-2222-4222-8222-222222222222",
        branch: "O",
        arrivalAtUniversity: "2026-03-01T00:00:00.000Z",
      },
    });
    const res = await (await import("@/app/api/v1/oc/route")).POST(req as any);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.oc.jnuEnrollmentNo).toBe("001");
  });
});
