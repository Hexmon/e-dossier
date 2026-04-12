import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getInterviewsRoute, POST as postInterviewsRoute } from "@/app/api/v1/oc/[ocId]/interviews/route";
import { createRouteContext, makeJsonRequest } from "../utils/next";
import { getEffectivePermissionBundleCached } from "@/app/db/queries/authz-permissions";

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
  assertOcSemesterWriteAllowed: vi.fn(),
}));

vi.mock("@/app/db/queries/interviewOc", () => ({
  getInterviewTemplateBase: vi.fn(),
  listInterviewTemplateSemestersByTemplate: vi.fn(),
  listInterviewTemplateFieldsByIds: vi.fn(),
  listInterviewTemplateFieldsByTemplate: vi.fn(),
  listInterviewTemplateGroupsByIds: vi.fn(),
  createOcInterview: vi.fn(),
  listOcInterviews: vi.fn(),
  listOcInterviewFieldValues: vi.fn(),
  listOcInterviewGroupRows: vi.fn(),
  listOcInterviewGroupValues: vi.fn(),
  upsertOcInterviewFieldValues: vi.fn(),
  upsertOcInterviewGroupRows: vi.fn(),
  upsertOcInterviewGroupValues: vi.fn(),
}));

vi.mock("@/app/db/queries/authz-permissions", () => ({
  getEffectivePermissionBundleCached: vi.fn(),
}));

import * as ocChecks from "@/app/api/v1/oc/_checks";
import * as interviewQueries from "@/app/db/queries/interviewOc";

const ocId = "11111111-1111-4111-8111-111111111111";
const templateId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const fieldId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("interview collection route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ocChecks.mustBeAuthed).mockResolvedValue({ userId: "user-1", roles: ["USER"], claims: {} } as any);
    vi.mocked(ocChecks.parseParam).mockImplementation(async ({ params }: any, schema: any) =>
      schema.parse(await params),
    );
    vi.mocked(ocChecks.ensureOcExists).mockResolvedValue(undefined);
    vi.mocked(ocChecks.assertOcSemesterWriteAllowed).mockResolvedValue(undefined as any);
    vi.mocked(interviewQueries.listOcInterviews).mockResolvedValue([] as any);
    vi.mocked(interviewQueries.listOcInterviewFieldValues).mockResolvedValue([] as any);
    vi.mocked(interviewQueries.listOcInterviewGroupRows).mockResolvedValue([] as any);
    vi.mocked(interviewQueries.listOcInterviewGroupValues).mockResolvedValue([] as any);
    vi.mocked(interviewQueries.listInterviewTemplateSemestersByTemplate).mockResolvedValue([] as any);
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
      permissions: ["oc:interviews:initial:plcdr:update"],
      deniedPermissions: [],
      fieldRulesByAction: {},
      policyVersion: 1,
    } as any);
  });

  it("lists interview records for the OC", async () => {
    const res = await getInterviewsRoute(
      makeJsonRequest({
        method: "GET",
        path: `/api/v1/oc/${ocId}/interviews`,
      }) as any,
      createRouteContext({ ocId }),
    );

    expect(res.status).toBe(200);
  });

  it("blocks post when the current user lacks the matching template permission", async () => {
    vi.mocked(interviewQueries.getInterviewTemplateBase).mockResolvedValue({
      id: templateId,
      code: "CDR_INITIAL",
      title: "CDR Initial Interview",
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

    const res = await postInterviewsRoute(
      makeJsonRequest({
        method: "POST",
        path: `/api/v1/oc/${ocId}/interviews`,
        body: {
          templateId,
          semester: 1,
          fields: [{ fieldId, valueText: "Col Someone" }],
        },
      }) as any,
      createRouteContext({ ocId }),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("forbidden");
    expect(interviewQueries.createOcInterview).not.toHaveBeenCalled();
  });

  it("allows post when the current user has the template permission", async () => {
    vi.mocked(interviewQueries.getInterviewTemplateBase).mockResolvedValue({
      id: templateId,
      code: "PLCDR_INITIAL",
      title: "PL CDR Initial Interview",
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
    vi.mocked(interviewQueries.createOcInterview).mockResolvedValue({
      id: "interview-1",
      ocId,
      templateId,
      semester: 1,
    } as any);
    vi.mocked(interviewQueries.upsertOcInterviewFieldValues).mockResolvedValue([] as any);

    const res = await postInterviewsRoute(
      makeJsonRequest({
        method: "POST",
        path: `/api/v1/oc/${ocId}/interviews`,
        body: {
          templateId,
          semester: 1,
          fields: [{ fieldId, valueText: "Capt A Kumar" }],
        },
      }) as any,
      createRouteContext({ ocId }),
    );

    expect(res.status).toBe(201);
    expect(interviewQueries.createOcInterview).toHaveBeenCalledTimes(1);
  });
});
