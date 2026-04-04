import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/oc/[ocId]/dossier-inspection/route";
import { createRouteContext, makeJsonRequest } from "../utils/next";

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
  mustHaveOcAccess: vi.fn(),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

import * as ocChecks from "@/app/api/v1/oc/_checks";
import { db } from "@/app/db/client";

const ocId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ocChecks.mustHaveOcAccess).mockResolvedValue({
    userId: "pc-1",
    roles: ["PLATOON_COMMANDER_EQUIVALENT"],
  } as any);
});

describe("GET /api/v1/oc/[ocId]/dossier-inspection", () => {
  it("returns an empty inspections list when no inspection rows exist", async () => {
    (db.select as any)
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: ocId }],
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
              where: () => ({
                orderBy: async () => [],
              }),
            }),
          }),
        }),
      }));

    const req = makeJsonRequest({
      method: "GET",
      path: `/api/v1/oc/${ocId}/dossier-inspection`,
    });

    const res = await GET(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.inspections).toEqual([]);
  });
});
