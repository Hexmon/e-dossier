import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as listMedicalRoute, POST as createMedicalRoute } from "@/app/api/v1/oc/[ocId]/medical/route";
import {
  GET as getMedicalRoute,
  PATCH as patchMedicalRoute,
  DELETE as deleteMedicalRoute,
} from "@/app/api/v1/oc/[ocId]/medical/[id]/route";
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
    OC_RECORD_CREATED: "oc.record.created",
    OC_RECORD_UPDATED: "oc.record.updated",
    OC_RECORD_DELETED: "oc.record.deleted",
  },
  AuditResourceType: {
    OC: "oc",
  },
}));

vi.mock("@/app/api/v1/oc/_checks", () => ({
  mustBeAuthed: vi.fn(),
  mustBeMedicalWriter: vi.fn(),
  parseParam: vi.fn(),
  ensureOcExists: vi.fn(),
  assertOcSemesterWriteAllowed: vi.fn(),
}));

vi.mock("@/app/db/queries/oc", () => ({
  listMedicals: vi.fn(),
  createMedical: vi.fn(),
  getMedical: vi.fn(),
  updateMedical: vi.fn(),
  deleteMedical: vi.fn(),
}));

import * as ocChecks from "@/app/api/v1/oc/_checks";
import * as ocQueries from "@/app/db/queries/oc";

const ocId = "11111111-1111-4111-8111-111111111111";
const recordId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ocChecks.mustBeAuthed).mockResolvedValue({ userId: "user-1", roles: ["USER"] } as any);
  vi.mocked(ocChecks.mustBeMedicalWriter).mockResolvedValue({
    userId: "pc-1",
    roles: ["PLATOON_COMMANDER_EQUIVALENT"],
  } as any);
  vi.mocked(ocChecks.parseParam).mockImplementation(async ({ params }: any, schema: any) =>
    schema.parse(await params)
  );
  vi.mocked(ocChecks.ensureOcExists).mockResolvedValue(undefined);
  vi.mocked(ocChecks.assertOcSemesterWriteAllowed).mockResolvedValue(undefined as any);
});

describe("medical routes", () => {
  it("lists medical records through the OC-scope read path", async () => {
    vi.mocked(ocQueries.listMedicals).mockResolvedValue([{ id: recordId, semester: 5 }] as any);

    const res = await listMedicalRoute(
      makeJsonRequest({ method: "GET", path: `/api/v1/oc/${ocId}/medical` }) as any,
      createRouteContext({ ocId })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(ocChecks.mustBeAuthed).toHaveBeenCalled();
  });

  it("rejects medical creation for non-commander writers", async () => {
    vi.mocked(ocChecks.mustBeMedicalWriter).mockRejectedValueOnce(
      new ApiError(
        403,
        "Medical updates are restricted to the commander-equivalent role for this platoon.",
        "forbidden"
      ) as any
    );

    const res = await createMedicalRoute(
      makeJsonRequest({
        method: "POST",
        path: `/api/v1/oc/${ocId}/medical`,
        body: { semester: 5, date: "2026-04-05" },
      }) as any,
      createRouteContext({ ocId })
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("forbidden");
    expect(body.message).toContain("commander-equivalent");
  });

  it("returns override_reason_required for super admin historical medical writes without a reason", async () => {
    vi.mocked(ocChecks.assertOcSemesterWriteAllowed).mockRejectedValueOnce(
      new ApiError(400, "Override reason required", "override_reason_required", {
        currentSemester: 5,
        requestedSemester: 1,
      }) as any
    );

    const res = await createMedicalRoute(
      makeJsonRequest({
        method: "POST",
        path: `/api/v1/oc/${ocId}/medical`,
        body: { semester: 1, date: "2026-04-05" },
      }) as any,
      createRouteContext({ ocId })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("override_reason_required");
  });

  it("updates and deletes medical records through the commander-only write path", async () => {
    vi.mocked(ocQueries.getMedical).mockResolvedValue({
      id: recordId,
      ocId,
      semester: 5,
    } as any);
    vi.mocked(ocQueries.updateMedical).mockResolvedValue({ id: recordId, ocId, semester: 5 } as any);
    vi.mocked(ocQueries.deleteMedical).mockResolvedValue({ id: recordId } as any);

    const patchRes = await patchMedicalRoute(
      makeJsonRequest({
        method: "PATCH",
        path: `/api/v1/oc/${ocId}/medical/${recordId}`,
        body: { allergies: "None" },
      }) as any,
      createRouteContext({ ocId, id: recordId })
    );
    expect(patchRes.status).toBe(200);

    const deleteRes = await deleteMedicalRoute(
      makeJsonRequest({
        method: "DELETE",
        path: `/api/v1/oc/${ocId}/medical/${recordId}`,
      }) as any,
      createRouteContext({ ocId, id: recordId })
    );
    expect(deleteRes.status).toBe(200);
    expect(ocChecks.mustBeMedicalWriter).toHaveBeenCalledTimes(2);
  });

  it("returns not_found once a medical record has already been soft deleted", async () => {
    vi.mocked(ocQueries.getMedical).mockResolvedValueOnce(null as any);

    const res = await deleteMedicalRoute(
      makeJsonRequest({
        method: "DELETE",
        path: `/api/v1/oc/${ocId}/medical/${recordId}`,
      }) as any,
      createRouteContext({ ocId, id: recordId })
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("not_found");
    expect(ocQueries.deleteMedical).not.toHaveBeenCalled();
  });

  it("retrieves an individual medical record through the read path", async () => {
    vi.mocked(ocQueries.getMedical).mockResolvedValue({ id: recordId, ocId, semester: 5 } as any);

    const res = await getMedicalRoute(
      makeJsonRequest({
        method: "GET",
        path: `/api/v1/oc/${ocId}/medical/${recordId}`,
      }) as any,
      createRouteContext({ ocId, id: recordId })
    );

    expect(res.status).toBe(200);
    expect(ocChecks.mustBeAuthed).toHaveBeenCalled();
  });
});
