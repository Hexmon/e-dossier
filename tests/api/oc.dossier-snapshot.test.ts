import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getDossierSnapshot } from "@/app/api/v1/oc/[ocId]/dossier-snapshot/route";
import { ApiError } from "@/app/lib/http";
import { createRouteContext, makeJsonRequest } from "../utils/next";

import * as ocChecks from "@/app/api/v1/oc/_checks";
import { db } from "@/app/db/client";

const auditLogMock = vi.fn(async () => undefined);

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
  AuditEventType: {
    API_REQUEST: "api.request",
  },
  AuditResourceType: {
    OC: "oc",
  },
}));

vi.mock("@/app/api/v1/oc/_checks", () => ({
  parseParam: vi.fn(),
  ensureOcExists: vi.fn(),
  mustHaveOcAccess: vi.fn(),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/app/lib/storage", () => ({
  buildImageKey: vi.fn(),
  createPresignedUploadUrl: vi.fn(),
  headObject: vi.fn(),
  createPresignedGetUrl: vi.fn(async ({ key }: { key: string }) => `https://cdn.local/${key}`),
}));

vi.mock("@/app/db/queries/oc", () => ({
  getOcImage: vi.fn(),
  upsertOcImage: vi.fn(),
}));

const ocId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ocChecks.parseParam).mockResolvedValue({ ocId } as any);
  vi.mocked(ocChecks.ensureOcExists).mockResolvedValue(undefined);
  vi.mocked(ocChecks.mustHaveOcAccess).mockResolvedValue({
    userId: "pc-1",
    roles: ["PLATOON_COMMANDER"],
  } as any);
});

describe("GET /api/v1/oc/[ocId]/dossier-snapshot", () => {
  it("returns 403 when the OC is outside the caller scope", async () => {
    vi.mocked(ocChecks.mustHaveOcAccess).mockRejectedValueOnce(
      new ApiError(403, "Not authorized to access this OC record", "forbidden")
    );

    const req = makeJsonRequest({ method: "GET", path: `/api/v1/oc/${ocId}/dossier-snapshot` });
    const res = await getDossierSnapshot(req as any, createRouteContext({ ocId }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("forbidden");
  });

  it("returns 403 when admin dossier access is disabled by module settings", async () => {
    vi.mocked(ocChecks.mustHaveOcAccess).mockRejectedValueOnce(
      new ApiError(
        403,
        "DOSSIER access is disabled for ADMIN by module access settings.",
        "module_access_denied"
      )
    );

    const req = makeJsonRequest({ method: "GET", path: `/api/v1/oc/${ocId}/dossier-snapshot` });
    const res = await getDossierSnapshot(req as any, createRouteContext({ ocId }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("module_access_denied");
  });

  it("returns dossier snapshot data for an in-scope OC", async () => {
    (db.select as any)
      .mockImplementationOnce(() => ({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              limit: async () => [
                {
                  id: ocId,
                  name: "Cadet One",
                  arrivalAtUniversity: new Date("2026-01-01T00:00:00Z"),
                  relegatedToCourseId: null,
                  relegatedOn: null,
                  withdrawnOn: null,
                  courseId: "course-1",
                  platoonId: null,
                  courseCode: "TES-50",
                  courseTitle: "TES 50",
                },
              ],
            }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                passOutDate: new Date("2026-12-31T00:00:00Z"),
                icNo: "IC-7",
                orderOfMerit: 5,
                regimentOrArm: "Signals",
                postedUnit: "Unit A",
              },
            ],
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: async () => [],
        }),
      }));

    const req = makeJsonRequest({ method: "GET", path: `/api/v1/oc/${ocId}/dossier-snapshot` });
    const res = await getDossierSnapshot(req as any, createRouteContext({ ocId }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Cadet One");
    expect(body.data.course).toBe("TES 50");
    expect(body.data.icNo).toBe("IC-7");
  });
});
