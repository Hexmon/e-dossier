import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as pendingInterviewsGET } from "@/app/api/v1/admin/interview/pending/route";
import { GET as tickerSettingGET, POST } from "@/app/api/v1/admin/interview/pending/ticker-setting/route";
import { makeJsonRequest, createRouteContext } from "../utils/next";
import { ApiError } from "@/app/lib/http";
import * as authz from "@/app/lib/authz";
import { listOCsBasic } from "@/app/db/queries/oc";
import * as tickerQueries from "@/app/db/queries/interview-pending-ticker-settings";

const { dbSelectMock, getTemplateMatchForSemesterMock } = vi.hoisted(() => ({
  dbSelectMock: vi.fn(),
  getTemplateMatchForSemesterMock: vi.fn(),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: dbSelectMock,
  },
}));

vi.mock("@/app/lib/authz", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/app/db/queries/oc", () => ({
  listOCsBasic: vi.fn(),
}));

vi.mock("@/app/db/queries/interviewTemplates", () => ({
  listInterviewTemplates: vi.fn(async () => []),
}));

vi.mock("@/app/db/queries/interview-pending-ticker-settings", () => ({
  getLatestInterviewPendingTickerSetting: vi.fn(async () => ({
    id: "4da4261e-c94a-48cc-94ab-74d087b991aa",
    startDate: "2026-03-01",
    endDate: "2026-03-10",
    days: 9,
    createdBy: "6ee0ee1f-dca4-4e91-90cc-d067f9a00e42",
    createdByUsername: "plcdr_user",
    createdAt: new Date("2026-03-10T08:00:00.000Z"),
  })),
  listInterviewPendingTickerSettingLogs: vi.fn(async () => [
    {
      id: "4da4261e-c94a-48cc-94ab-74d087b991aa",
      startDate: "2026-03-01",
      endDate: "2026-03-10",
      days: 9,
      createdBy: "6ee0ee1f-dca4-4e91-90cc-d067f9a00e42",
      createdByUsername: "plcdr_user",
      createdAt: new Date("2026-03-10T08:00:00.000Z"),
    },
  ]),
  createInterviewPendingTickerSetting: vi.fn(async (input: any) => ({
    id: "c2521817-b715-4c6d-ab8f-4ef1f18f9700",
    startDate: input.startDate,
    endDate: input.endDate,
    days: input.days,
    createdBy: "6ee0ee1f-dca4-4e91-90cc-d067f9a00e42",
    createdByUsername: "plcdr_user",
    createdAt: new Date("2026-03-10T08:30:00.000Z"),
  })),
}));

vi.mock("@/app/db/schema/training/oc", () => ({
  ocCourseEnrollments: {
    ocId: "ocId",
    id: "id",
    status: "status",
  },
}));

vi.mock("@/app/db/schema/training/interviewOc", () => ({
  ocInterviews: {
    id: "id",
    ocId: "ocId",
    enrollmentId: "enrollmentId",
    templateId: "templateId",
    semester: "semester",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  ocInterviewFieldValues: {
    interviewId: "interviewId",
    valueText: "valueText",
    valueDate: "valueDate",
    valueNumber: "valueNumber",
    valueBool: "valueBool",
    valueJson: "valueJson",
  },
  ocInterviewGroupRows: {
    id: "id",
    interviewId: "interviewId",
  },
  ocInterviewGroupValues: {
    rowId: "rowId",
    valueText: "valueText",
    valueDate: "valueDate",
    valueNumber: "valueNumber",
    valueBool: "valueBool",
    valueJson: "valueJson",
  },
}));

vi.mock("@/app/db/schema/training/interviewTemplates", () => ({
  interviewTemplateSections: {},
  interviewTemplateGroups: {},
  interviewTemplateFields: {},
}));

vi.mock("@/lib/interviewTemplateMatching", () => ({
  buildTemplateMappings: vi.fn((templates: unknown) => templates),
  getTemplateMatchForSemester: getTemplateMatchForSemesterMock,
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  eq: vi.fn(),
  inArray: vi.fn(),
  isNull: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAuth).mockResolvedValue({
    userId: "6ee0ee1f-dca4-4e91-90cc-d067f9a00e42",
    roles: ["arjunplcdr"],
    claims: {
      apt: {
        position: "arjunplcdr",
        scope: {
          type: "PLATOON",
          id: "f008719d-531f-465f-a90c-47743cfe5031",
        },
      },
    },
  } as Awaited<ReturnType<typeof authz.requireAuth>>);
});

function queueSelectRows(rows: unknown[]) {
  dbSelectMock.mockReturnValueOnce({
    from: vi.fn(() => ({
      where: vi.fn(async () => rows),
    })),
  });
}

describe("Admin interview pending ticker setting API", () => {
  const basePath = "/api/v1/admin/interview/pending/ticker-setting";

  it("returns 401 when authentication fails", async () => {
    vi.mocked(authz.requireAuth).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    const req = makeJsonRequest({ method: "GET", path: basePath });
    const res = await tickerSettingGET(req as any, createRouteContext());
    expect(res.status).toBe(401);
  });

  it("GET returns latest setting without logs when includeLogs=false", async () => {
    const req = makeJsonRequest({
      method: "GET",
      path: `${basePath}?includeLogs=false`,
    });

    const res = await tickerSettingGET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.setting.days).toBe(9);
    expect(body.logs).toEqual([]);
    expect(tickerQueries.listInterviewPendingTickerSettingLogs).not.toHaveBeenCalled();
  });

  it("GET returns logs when includeLogs=true", async () => {
    const req = makeJsonRequest({
      method: "GET",
      path: `${basePath}?includeLogs=true&limit=10&offset=0`,
    });

    const res = await tickerSettingGET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.logs).toHaveLength(1);
    expect(tickerQueries.listInterviewPendingTickerSettingLogs).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
    });
  });

  it("GET allows non-admin users outside platoon scope for dashboard marquee reads", async () => {
    vi.mocked(authz.requireAuth).mockResolvedValueOnce({
      userId: "user-2",
      roles: ["TRAINING_OFFICER"],
      claims: {
        apt: {
          position: "TRAINING_OFFICER",
          scope: {
            type: "GLOBAL",
            id: null,
          },
        },
      },
    } as Awaited<ReturnType<typeof authz.requireAuth>>);

    const req = makeJsonRequest({
      method: "GET",
      path: `${basePath}?includeLogs=false`,
    });

    const res = await tickerSettingGET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.setting.days).toBe(9);
  });

  it("POST returns 403 for non-admin users outside platoon scope", async () => {
    vi.mocked(authz.requireAuth).mockResolvedValueOnce({
      userId: "user-2",
      roles: ["TRAINING_OFFICER"],
      claims: {
        apt: {
          position: "TRAINING_OFFICER",
          scope: {
            type: "GLOBAL",
            id: null,
          },
        },
      },
    } as Awaited<ReturnType<typeof authz.requireAuth>>);

    const req = makeJsonRequest({
      method: "POST",
      path: basePath,
      body: {
        startDate: "2026-03-01",
        endDate: "2026-03-10",
      },
    });

    const res = await POST(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.message).toBe("Forbidden: ticker setting access denied.");
  });

  it("POST validates start/end range", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: basePath,
      body: {
        startDate: "2026-03-12",
        endDate: "2026-03-10",
      },
    });

    const res = await POST(req as any, createRouteContext());
    expect(res.status).toBe(400);
  });

  it("POST saves setting and returns computed days", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: basePath,
      body: {
        startDate: "2026-03-01",
        endDate: "2026-03-10",
      },
    });

    const res = await POST(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.setting.days).toBe(9);
    expect(tickerQueries.createInterviewPendingTickerSetting).toHaveBeenCalledWith(
      {
        startDate: "2026-03-01",
        endDate: "2026-03-10",
        days: 9,
      },
      "6ee0ee1f-dca4-4e91-90cc-d067f9a00e42"
    );
  });
});

describe("Admin interview pending API", () => {
  beforeEach(() => {
    getTemplateMatchForSemesterMock.mockImplementation((_mappings, kind: string, semester: number) => {
      const termTemplateIds: Record<string, string> = {
        beginning: "term-beginning-template",
        postmid: "term-postmid-template",
        special: "term-special-template",
      };

      if (semester !== 1 || !termTemplateIds[kind]) return null;
      return {
        template: {
          id: termTemplateIds[kind],
          semesters: [1],
        },
      };
    });
  });

  it("marks terms complete when any terms sub-tab has content", async () => {
    vi.mocked(listOCsBasic).mockResolvedValue([
      {
        id: "oc-pending",
        ocNo: "101",
        name: "Pending OC",
        courseCode: "C1",
        courseTitle: "Course 1",
        platoonKey: "A",
        platoonName: "Alpha",
      },
      {
        id: "oc-complete",
        ocNo: "102",
        name: "Complete OC",
        courseCode: "C1",
        courseTitle: "Course 1",
        platoonKey: "A",
        platoonName: "Alpha",
      },
    ] as any);

    queueSelectRows([
      { ocId: "oc-pending", enrollmentId: "enrollment-pending" },
      { ocId: "oc-complete", enrollmentId: "enrollment-complete" },
    ]);
    queueSelectRows([
      {
        id: "postmid-complete",
        ocId: "oc-complete",
        enrollmentId: "enrollment-complete",
        templateId: "term-postmid-template",
        semester: 1,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        updatedAt: new Date("2026-04-01T00:00:00.000Z"),
      },
    ]);
    queueSelectRows([
      {
        interviewId: "postmid-complete",
        valueText: "Filled",
        valueDate: null,
        valueNumber: null,
        valueBool: null,
        valueJson: null,
      },
    ]);
    queueSelectRows([]);

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/interview/pending?active=true&sort=name_asc",
    });
    req.audit = { log: vi.fn(async () => undefined) };

    const res = await (pendingInterviewsGET as any)(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toMatchObject([
      { ocNo: "101", completeTerms: false },
      { ocNo: "102", completeTerms: true },
    ]);
    expect(listOCsBasic).toHaveBeenCalledWith(
      expect.objectContaining({
        platoonId: "f008719d-531f-465f-a90c-47743cfe5031",
      }),
    );
  });
});
