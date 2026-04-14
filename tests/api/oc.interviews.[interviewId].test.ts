import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DELETE as deleteInterviewRoute,
  GET as getInterviewRoute,
  PATCH as patchInterviewRoute,
} from "@/app/api/v1/oc/[ocId]/interviews/[interviewId]/route";
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
    OC_RECORD_DELETED: "oc.record.deleted",
  },
  AuditResourceType: {
    OC: "oc",
  },
}));

vi.mock("@/app/api/v1/oc/_checks", () => ({
  mustBeAuthed: vi.fn(),
  parseParam: vi.fn(),
  ensureOcExists: vi.fn(),
  assertOcSemesterWriteAllowed: vi.fn(),
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
  listInterviewTemplateFieldsByTemplate: vi.fn(),
  listInterviewTemplateGroupsByIds: vi.fn(),
}));

vi.mock("@/app/db/queries/authz-permissions", () => ({
  getEffectivePermissionBundleCached: vi.fn(),
}));

import * as ocChecks from "@/app/api/v1/oc/_checks";
import * as interviewQueries from "@/app/db/queries/interviewOc";
import { getEffectivePermissionBundleCached } from "@/app/db/queries/authz-permissions";

const ocId = "11111111-1111-4111-8111-111111111111";
const interviewId = "33333333-3333-4333-8333-333333333333";
const templateId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const fieldId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ocChecks.mustBeAuthed).mockResolvedValue({ userId: "user-1", roles: ["USER"], claims: {} } as any);
  vi.mocked(ocChecks.parseParam).mockImplementation(async ({ params }: any, schema: any) =>
    schema.parse(await params)
  );
  vi.mocked(ocChecks.ensureOcExists).mockResolvedValue(undefined);
  vi.mocked(ocChecks.assertOcSemesterWriteAllowed).mockResolvedValue(undefined as any);
  vi.mocked(interviewQueries.listOcInterviewFieldValues).mockResolvedValue([] as any);
  vi.mocked(interviewQueries.listOcInterviewGroupRows).mockResolvedValue([] as any);
  vi.mocked(interviewQueries.listOcInterviewGroupValues).mockResolvedValue([] as any);
  vi.mocked(interviewQueries.listInterviewTemplateSemestersByTemplate).mockResolvedValue([] as any);
  vi.mocked(interviewQueries.listInterviewTemplateFieldsByIds).mockResolvedValue([] as any);
  vi.mocked(interviewQueries.listInterviewTemplateFieldsByTemplate).mockResolvedValue([] as any);
  vi.mocked(interviewQueries.listInterviewTemplateGroupsByIds).mockResolvedValue([] as any);
  vi.mocked(interviewQueries.upsertOcInterviewFieldValues).mockResolvedValue([] as any);
  vi.mocked(interviewQueries.upsertOcInterviewGroupRows).mockResolvedValue([] as any);
  vi.mocked(interviewQueries.upsertOcInterviewGroupValues).mockResolvedValue([] as any);
  vi.mocked(getEffectivePermissionBundleCached).mockResolvedValue({
    userId: "user-1",
    roles: ["PLATOON_COMMANDER_EQUIVALENT"],
    appointment: {
      appointmentId: "apt-1",
      positionId: "pos-1",
      positionKey: "PTN_CDR",
      scopeType: "PLATOON",
      scopeId: "platoon-1",
    },
    isAdmin: false,
    isSuperAdmin: false,
    permissions: [
      "oc:interviews:initial:plcdr:update",
      "oc:interviews:term:beginning:shared:update",
      "oc:interviews:term:beginning:plcdr:update",
      "oc:interviews:term:postmid:update",
      "oc:interviews:special:update",
    ],
    deniedPermissions: [],
    fieldRulesByAction: {},
    policyVersion: 1,
  } as any);
});

describe("interview record route", () => {
  it("retrieves an active interview record", async () => {
    vi.mocked(interviewQueries.getOcInterview).mockResolvedValue({
      id: interviewId,
      ocId,
      templateId,
      semester: 5,
    } as any);

    const res = await getInterviewRoute(
      makeJsonRequest({
        method: "GET",
        path: `/api/v1/oc/${ocId}/interviews/${interviewId}`,
      }) as any,
      createRouteContext({ ocId, interviewId })
    );

    expect(res.status).toBe(200);
  });

  it("soft deletes an active interview record", async () => {
    vi.mocked(interviewQueries.getOcInterview).mockResolvedValue({
      id: interviewId,
      ocId,
      templateId,
      semester: 5,
    } as any);
    vi.mocked(interviewQueries.deleteOcInterview).mockResolvedValue({
      id: interviewId,
      ocId,
      templateId,
      semester: 5,
    } as any);

    const res = await deleteInterviewRoute(
      makeJsonRequest({
        method: "DELETE",
        path: `/api/v1/oc/${ocId}/interviews/${interviewId}`,
      }) as any,
      createRouteContext({ ocId, interviewId })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deleted).toBe(interviewId);
  });

  it("returns not_found when an interview was already soft deleted", async () => {
    vi.mocked(interviewQueries.getOcInterview).mockResolvedValue(null as any);

    const res = await deleteInterviewRoute(
      makeJsonRequest({
        method: "DELETE",
        path: `/api/v1/oc/${ocId}/interviews/${interviewId}`,
      }) as any,
      createRouteContext({ ocId, interviewId })
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("not_found");
    expect(interviewQueries.deleteOcInterview).not.toHaveBeenCalled();
  });

  it("keeps derived semester locking on delete", async () => {
    vi.mocked(interviewQueries.getOcInterview).mockResolvedValue({
      id: interviewId,
      ocId,
      templateId,
      semester: 1,
    } as any);
    vi.mocked(ocChecks.assertOcSemesterWriteAllowed).mockRejectedValueOnce(
      new ApiError(403, "Only the current semester can be modified.", "semester_locked", {
        currentSemester: 5,
        requestedSemester: 1,
      }) as any
    );

    const res = await deleteInterviewRoute(
      makeJsonRequest({
        method: "DELETE",
        path: `/api/v1/oc/${ocId}/interviews/${interviewId}`,
      }) as any,
      createRouteContext({ ocId, interviewId })
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("semester_locked");
  });

  it("blocks patch when the current user lacks the field permission", async () => {
    vi.mocked(interviewQueries.getOcInterview).mockResolvedValue({
      id: interviewId,
      ocId,
      templateId,
      semester: 5,
    } as any);
    vi.mocked(interviewQueries.getInterviewTemplateBase).mockResolvedValue({
      id: templateId,
      code: "DYCDR_INITIAL",
      title: "DY CDR Initial Interview",
      isActive: true,
      deletedAt: null,
    } as any);
    vi.mocked(interviewQueries.listInterviewTemplateFieldsByIds).mockResolvedValue([
      {
        id: fieldId,
        templateId,
        groupId: null,
        isActive: true,
        deletedAt: null,
      },
    ] as any);
    vi.mocked(interviewQueries.listInterviewTemplateFieldsByTemplate).mockResolvedValue([
      {
        id: fieldId,
        templateId,
        groupId: null,
        key: "interviewedBy",
        label: "Interviewed By",
        fieldType: "text",
        captureSignature: false,
        isActive: true,
        deletedAt: null,
      },
    ] as any);

    const res = await patchInterviewRoute(
      makeJsonRequest({
        method: "PATCH",
        path: `/api/v1/oc/${ocId}/interviews/${interviewId}`,
        body: {
          fields: [{ fieldId, valueText: "Maj Someone" }],
        },
      }) as any,
      createRouteContext({ ocId, interviewId }),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("forbidden");
    expect(interviewQueries.upsertOcInterviewFieldValues).not.toHaveBeenCalled();
  });

  it("allows patch when the current user has the matching officer permission", async () => {
    vi.mocked(getEffectivePermissionBundleCached).mockResolvedValueOnce({
      userId: "user-1",
      roles: ["DCCI"],
      appointment: {
        appointmentId: "apt-1",
        positionId: "pos-1",
        positionKey: "DCCI",
        scopeType: "GLOBAL",
        scopeId: null,
      },
      isAdmin: false,
      isSuperAdmin: false,
      permissions: ["oc:interviews:initial:dycdr:update"],
      deniedPermissions: [],
      fieldRulesByAction: {},
      policyVersion: 1,
    } as any);
    vi.mocked(interviewQueries.getOcInterview).mockResolvedValue({
      id: interviewId,
      ocId,
      templateId,
      semester: 5,
    } as any);
    vi.mocked(interviewQueries.getInterviewTemplateBase).mockResolvedValue({
      id: templateId,
      code: "DYCDR_INITIAL",
      title: "DY CDR Initial Interview",
      isActive: true,
      deletedAt: null,
    } as any);
    vi.mocked(interviewQueries.listInterviewTemplateFieldsByIds).mockResolvedValue([
      {
        id: fieldId,
        templateId,
        groupId: null,
        isActive: true,
        deletedAt: null,
      },
    ] as any);
    vi.mocked(interviewQueries.listInterviewTemplateFieldsByTemplate).mockResolvedValue([
      {
        id: fieldId,
        templateId,
        groupId: null,
        key: "interviewedBy",
        label: "Interviewed By",
        fieldType: "text",
        captureSignature: false,
        isActive: true,
        deletedAt: null,
      },
    ] as any);
    vi.mocked(interviewQueries.upsertOcInterviewFieldValues).mockResolvedValue([] as any);

    const res = await patchInterviewRoute(
      makeJsonRequest({
        method: "PATCH",
        path: `/api/v1/oc/${ocId}/interviews/${interviewId}`,
        body: {
          fields: [{ fieldId, valueText: "Maj Someone" }],
        },
      }) as any,
      createRouteContext({ ocId, interviewId }),
    );

    expect(res.status).toBe(200);
    expect(interviewQueries.upsertOcInterviewFieldValues).toHaveBeenCalledTimes(1);
  });
});
