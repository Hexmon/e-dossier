import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/app/lib/http";
import { PATCH as patchLeaveLikeRoute } from "@/app/api/v1/oc/[ocId]/recording-leave-hike-detention/[id]/route";
import { DELETE as deleteInterviewRoute } from "@/app/api/v1/oc/[ocId]/interviews/[interviewId]/route";
import { DELETE as deleteCampsRoute } from "@/app/api/v1/oc/[ocId]/camps/route";
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
    OC_RECORD_DELETED: "oc.record.deleted",
  },
  AuditResourceType: {
    OC: "oc",
  },
}));

vi.mock("@/app/api/v1/oc/_checks", () => ({
  mustBeAuthed: vi.fn(),
  mustBeAdmin: vi.fn(),
  parseParam: vi.fn(),
  ensureOcExists: vi.fn(),
  assertOcSemesterWriteAllowed: vi.fn(),
}));

vi.mock("@/app/db/queries/oc", () => ({
  getRecordingLeaveHikeDetention: vi.fn(),
  updateRecordingLeaveHikeDetention: vi.fn(),
  deleteRecordingLeaveHikeDetention: vi.fn(),
  getOcCamps: vi.fn(),
  upsertOcCamp: vi.fn(),
  upsertOcCampReview: vi.fn(),
  upsertOcCampActivityScore: vi.fn(),
  deleteOcCamp: vi.fn(),
  deleteOcCampReview: vi.fn(),
  deleteOcCampActivityScore: vi.fn(),
  recomputeOcCampTotal: vi.fn(),
}));

vi.mock("@/app/db/queries/interviewOc", () => ({
  getOcInterview: vi.fn(),
  updateOcInterview: vi.fn(),
  deleteOcInterview: vi.fn(),
  listOcInterviewFieldValues: vi.fn(),
  listOcInterviewGroupRows: vi.fn(),
  listOcInterviewGroupValues: vi.fn(),
  upsertOcInterviewFieldValues: vi.fn(),
  upsertOcInterviewGroupRows: vi.fn(),
  upsertOcInterviewGroupValues: vi.fn(),
  deleteOcInterviewGroupRowsByIds: vi.fn(),
  getInterviewTemplateBase: vi.fn(),
  listInterviewTemplateSemestersByTemplate: vi.fn(),
  listInterviewTemplateFieldsByIds: vi.fn(),
  listInterviewTemplateGroupsByIds: vi.fn(),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

import * as ocChecks from "@/app/api/v1/oc/_checks";
import * as ocQueries from "@/app/db/queries/oc";
import * as interviewQueries from "@/app/db/queries/interviewOc";
import { db } from "@/app/db/client";

const ocId = "11111111-1111-4111-8111-111111111111";
const recordId = "22222222-2222-4222-8222-222222222222";
const interviewId = "33333333-3333-4333-8333-333333333333";
const reviewId = "44444444-4444-4444-8444-444444444444";

function mockDbLimitResult(result: unknown) {
  const chain: any = {
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn().mockResolvedValue(result),
  };

  vi.mocked(db.select as any).mockReturnValue({
    from: vi.fn(() => chain),
  } as any);
}

describe("derived semester route locks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ocChecks.mustBeAuthed).mockResolvedValue({ userId: "user-1", roles: ["USER"], claims: {} } as any);
    vi.mocked(ocChecks.parseParam).mockImplementation(async ({ params }: any, schema: any) => schema.parse(await params));
    vi.mocked(ocChecks.ensureOcExists).mockResolvedValue(undefined);
  });

  it("uses the existing leave/hike/detention record semester when PATCH omits semester", async () => {
    vi.mocked(ocQueries.getRecordingLeaveHikeDetention).mockResolvedValue({
      id: recordId,
      ocId,
      semester: 1,
      type: "LEAVE",
    } as any);
    vi.mocked(ocChecks.assertOcSemesterWriteAllowed).mockRejectedValueOnce(
      new ApiError(403, "Only the current semester can be modified.", "semester_locked", {
        currentSemester: 3,
        requestedSemester: 1,
      }) as any,
    );

    const req = makeJsonRequest({
      method: "PATCH",
      path: `/api/v1/oc/${ocId}/recording-leave-hike-detention/${recordId}`,
      body: { remark: "Updated" },
    });

    const res = await patchLeaveLikeRoute(req as any, createRouteContext({ ocId, id: recordId }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("semester_locked");
    expect(ocChecks.assertOcSemesterWriteAllowed).toHaveBeenCalledWith(
      expect.objectContaining({ requestedSemester: 1 })
    );
  });

  it("uses the existing interview semester on delete", async () => {
    vi.mocked(interviewQueries.getOcInterview).mockResolvedValue({
      id: interviewId,
      ocId,
      templateId: "template-1",
      semester: 2,
    } as any);
    vi.mocked(ocChecks.assertOcSemesterWriteAllowed).mockRejectedValueOnce(
      new ApiError(403, "Only the current semester can be modified.", "semester_locked", {
        currentSemester: 3,
        requestedSemester: 2,
      }) as any,
    );

    const req = makeJsonRequest({
      method: "DELETE",
      path: `/api/v1/oc/${ocId}/interviews/${interviewId}`,
    });

    const res = await deleteInterviewRoute(req as any, createRouteContext({ ocId, interviewId }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("semester_locked");
    expect(ocChecks.assertOcSemesterWriteAllowed).toHaveBeenCalledWith(
      expect.objectContaining({ requestedSemester: 2 })
    );
  });

  it("derives the camp semester from the review owner before delete", async () => {
    mockDbLimitResult([{ ocCampId: "camp-1", ownerOcId: ocId, semester: 1 }]);
    vi.mocked(ocChecks.assertOcSemesterWriteAllowed).mockRejectedValueOnce(
      new ApiError(403, "Only the current semester can be modified.", "semester_locked", {
        currentSemester: 4,
        requestedSemester: 1,
      }) as any,
    );

    const req = makeJsonRequest({
      method: "DELETE",
      path: `/api/v1/oc/${ocId}/camps`,
      body: { reviewId },
    });

    const res = await deleteCampsRoute(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("semester_locked");
    expect(ocChecks.assertOcSemesterWriteAllowed).toHaveBeenCalledWith(
      expect.objectContaining({ requestedSemester: 1 })
    );
    expect(ocQueries.deleteOcCampReview).not.toHaveBeenCalled();
  });
});
