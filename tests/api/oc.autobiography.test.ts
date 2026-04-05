import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, PATCH } from "@/app/api/v1/oc/[ocId]/autobiography/route";
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
    OC_RECORD_UPDATED: "oc.record.updated",
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

vi.mock("@/app/db/queries/oc", () => ({
  getAutobio: vi.fn(),
  getAutobiographyView: vi.fn(),
  upsertAutobio: vi.fn(),
  deleteAutobio: vi.fn(),
}));

import * as ocChecks from "@/app/api/v1/oc/_checks";
import * as ocQueries from "@/app/db/queries/oc";

const ocId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ocChecks.parseParam).mockResolvedValue({ ocId } as any);
  vi.mocked(ocChecks.ensureOcExists).mockResolvedValue(undefined);
  vi.mocked(ocChecks.mustHaveOcAccess).mockResolvedValue({
    userId: "pc-1",
    roles: ["PLATOON_COMMANDER_EQUIVALENT"],
  } as any);
});

describe("GET /api/v1/oc/[ocId]/autobiography", () => {
  it("returns stable virtual defaults when the autobiography row is missing", async () => {
    vi.mocked(ocQueries.getAutobiographyView).mockResolvedValueOnce({
      generalSelf: "",
      proficiencySports: "",
      achievementsNote: "",
      areasToWork: "",
      additionalInfo: "",
      filledOn: "",
      platoonCommanderName: "",
    });

    const req = makeJsonRequest({
      method: "GET",
      path: `/api/v1/oc/${ocId}/autobiography`,
    });

    const res = await GET(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({
      generalSelf: "",
      proficiencySports: "",
      achievementsNote: "",
      areasToWork: "",
      additionalInfo: "",
      filledOn: "",
      platoonCommanderName: "",
    });
  });
});

describe("PATCH /api/v1/oc/[ocId]/autobiography", () => {
  it("still materializes the autobiography row on first save through PATCH", async () => {
    vi.mocked(ocQueries.upsertAutobio).mockResolvedValueOnce({
      ocId,
      generalSelf: "Steady under pressure",
      proficiencySports: "Football",
      achievementsNote: "Inter-company winner",
      areasToWork: "Map reading",
      additionalInfo: "Nil",
      filledOn: "2026-04-04T00:00:00.000Z",
      platoonCommanderName: "Maj Kumar",
    } as any);

    const req = makeJsonRequest({
      method: "PATCH",
      path: `/api/v1/oc/${ocId}/autobiography`,
      body: {
        generalSelf: "Steady under pressure",
        proficiencySports: "Football",
        achievementsNote: "Inter-company winner",
        areasToWork: "Map reading",
        additionalInfo: "Nil",
        filledOn: "2026-04-04T00:00:00.000Z",
        platoonCommanderName: "Maj Kumar",
      },
    });

    const res = await PATCH(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.generalSelf).toBe("Steady under pressure");
    expect(ocQueries.upsertAutobio).toHaveBeenCalledWith(ocId, {
      generalSelf: "Steady under pressure",
      proficiencySports: "Football",
      achievementsNote: "Inter-company winner",
      areasToWork: "Map reading",
      additionalInfo: "Nil",
      filledOn: new Date("2026-04-04T00:00:00.000Z"),
      platoonCommanderName: "Maj Kumar",
    });
  });
});
