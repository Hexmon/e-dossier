import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, PATCH } from "@/app/api/v1/oc/[ocId]/dossier-filling/route";
import { ApiError } from "@/app/lib/http";
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
  getDossierFilling: vi.fn(),
  getDossierFillingView: vi.fn(),
  upsertDossierFilling: vi.fn(),
  deleteDossierFilling: vi.fn(),
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

describe("GET /api/v1/oc/[ocId]/dossier-filling", () => {
  it("returns stable virtual defaults when the dossier row was never materialized", async () => {
    vi.mocked(ocQueries.getDossierFillingView).mockResolvedValueOnce({
      initiatedBy: "",
      openedOn: "",
      initialInterview: "",
      closedBy: "",
      closedOn: "",
      finalInterview: "",
    });

    const req = makeJsonRequest({
      method: "GET",
      path: `/api/v1/oc/${ocId}/dossier-filling`,
    });

    const res = await GET(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({
      initiatedBy: "",
      openedOn: "",
      initialInterview: "",
      closedBy: "",
      closedOn: "",
      finalInterview: "",
    });
  });

  it("returns module_access_denied when dossier access is blocked for ADMIN", async () => {
    vi.mocked(ocChecks.mustHaveOcAccess).mockRejectedValueOnce(
      new ApiError(
        403,
        "DOSSIER access is disabled for ADMIN by module access settings.",
        "module_access_denied"
      )
    );

    const req = makeJsonRequest({
      method: "GET",
      path: `/api/v1/oc/${ocId}/dossier-filling`,
    });

    const res = await GET(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("module_access_denied");
  });
});

describe("PATCH /api/v1/oc/[ocId]/dossier-filling", () => {
  it("still materializes the dossier row on first save through PATCH", async () => {
    vi.mocked(ocQueries.upsertDossierFilling).mockResolvedValueOnce({
      ocId,
      initiatedBy: "Capt Singh",
      openedOn: "2026-04-04T00:00:00.000Z",
      initialInterview: "Initial remarks",
      closedBy: "",
      closedOn: "",
      finalInterview: "",
    } as any);

    const req = makeJsonRequest({
      method: "PATCH",
      path: `/api/v1/oc/${ocId}/dossier-filling`,
      body: {
        initiatedBy: "Capt Singh",
        openedOn: "2026-04-04T00:00:00.000Z",
        initialInterview: "Initial remarks",
      },
    });

    const res = await PATCH(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.initiatedBy).toBe("Capt Singh");
    expect(ocQueries.upsertDossierFilling).toHaveBeenCalledWith(ocId, {
      initiatedBy: "Capt Singh",
      openedOn: new Date("2026-04-04T00:00:00.000Z"),
      initialInterview: "Initial remarks",
    });
  });
});
