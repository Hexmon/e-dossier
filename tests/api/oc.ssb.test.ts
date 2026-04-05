import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, POST } from "@/app/api/v1/oc/[ocId]/ssb/route";
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
    OC_RECORD_CREATED: "oc.record.created",
  },
  AuditResourceType: {
    OC: "oc",
  },
}));

vi.mock("@/app/api/v1/oc/_checks", () => ({
  mustBeAuthed: vi.fn(),
  parseParam: vi.fn(),
  ensureOcExists: vi.fn(),
}));

vi.mock("@/app/db/queries/oc", () => ({
  getSsbReport: vi.fn(),
  getSsbReportView: vi.fn(),
  deleteSsbReport: vi.fn(),
  listSsbPoints: vi.fn(),
  upsertSsbReportWithPoints: vi.fn(),
}));

import * as ocChecks from "@/app/api/v1/oc/_checks";
import * as ocQueries from "@/app/db/queries/oc";

const ocId = "11111111-1111-4111-8111-111111111111";
const reportId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ocChecks.mustBeAuthed).mockResolvedValue({ userId: "pc-1" } as any);
  vi.mocked(ocChecks.parseParam).mockResolvedValue({ ocId } as any);
  vi.mocked(ocChecks.ensureOcExists).mockResolvedValue(undefined);
});

describe("GET /api/v1/oc/[ocId]/ssb", () => {
  it("returns stable empty defaults when SSB data was never materialized", async () => {
    vi.mocked(ocQueries.getSsbReportView).mockResolvedValueOnce({
      positives: [],
      negatives: [],
      predictiveRating: 0,
      scopeForImprovement: "",
    });

    const req = makeJsonRequest({
      method: "GET",
      path: `/api/v1/oc/${ocId}/ssb`,
    });

    const res = await GET(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.positives).toEqual([]);
    expect(body.negatives).toEqual([]);
    expect(body.predictiveRating).toBe(0);
    expect(body.scopeForImprovement).toBe("");
  });
});

describe("POST /api/v1/oc/[ocId]/ssb", () => {
  it("still materializes the first SSB report row from the save route", async () => {
    vi.mocked(ocQueries.upsertSsbReportWithPoints).mockResolvedValueOnce(undefined as any);
    vi.mocked(ocQueries.getSsbReport).mockResolvedValueOnce({
      id: reportId,
      overallPredictiveRating: 4,
      scopeOfImprovement: "Increase confidence",
    } as any);
    vi.mocked(ocQueries.listSsbPoints).mockResolvedValueOnce([
      { kind: "POSITIVE", remark: "Calm", authorName: "Staff" },
      { kind: "NEGATIVE", remark: "Hesitant", authorName: "Staff" },
    ] as any);

    const req = makeJsonRequest({
      method: "POST",
      path: `/api/v1/oc/${ocId}/ssb`,
      body: {
        positives: [{ note: "Calm", by: "Staff" }],
        negatives: [{ note: "Hesitant", by: "Staff" }],
        predictiveRating: 4,
        scopeForImprovement: "Increase confidence",
      },
    });

    const res = await POST(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.predictiveRating).toBe(4);
    expect(body.scopeForImprovement).toBe("Increase confidence");
    expect(ocQueries.upsertSsbReportWithPoints).toHaveBeenCalledWith(ocId, {
      overallPredictiveRating: 4,
      scopeOfImprovement: "Increase confidence",
      positives: [{ note: "Calm", by: "Staff" }],
      negatives: [{ note: "Hesitant", by: "Staff" }],
    });
  });
});

describe("DELETE /api/v1/oc/[ocId]/ssb", () => {
  it("soft deletes the active SSB report", async () => {
    vi.mocked(ocQueries.deleteSsbReport).mockResolvedValueOnce({ id: reportId } as any);

    const req = makeJsonRequest({
      method: "DELETE",
      path: `/api/v1/oc/${ocId}/ssb`,
    });

    const res = await DELETE(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deleted.id).toBe(reportId);
  });

  it("returns not_found when the SSB report was already soft deleted", async () => {
    vi.mocked(ocQueries.deleteSsbReport).mockResolvedValueOnce(null as any);

    const req = makeJsonRequest({
      method: "DELETE",
      path: `/api/v1/oc/${ocId}/ssb`,
    });

    const res = await DELETE(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("not_found");
  });
});
