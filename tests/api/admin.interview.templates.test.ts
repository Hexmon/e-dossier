import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/admin/interview/templates/route";
import { makeJsonRequest, createRouteContext } from "../utils/next";

vi.mock("@/app/lib/acx/withAuthz", () => ({
  withAuthz: (handler: any) => handler,
}));

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => async (req: any, context: any) => {
    req.audit = { log: vi.fn(async () => undefined) };
    return handler(req, context);
  },
  AuditEventType: {
    INTERVIEW_TEMPLATE_CREATED: "interview.template.created",
  },
  AuditResourceType: {
    INTERVIEW_TEMPLATE: "interview_template",
  },
}));

vi.mock("@/app/lib/authz", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/app/db/queries/interviewTemplates", () => ({
  listInterviewTemplates: vi.fn(),
  listInterviewTemplatesHydrated: vi.fn(),
  createInterviewTemplate: vi.fn(),
}));

import { requireAuth } from "@/app/lib/authz";
import {
  listInterviewTemplates,
  listInterviewTemplatesHydrated,
} from "@/app/db/queries/interviewTemplates";

describe("admin interview templates API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: "pc-1",
      roles: ["PLATOON_COMMANDER"],
      claims: {
        apt: {
          position: "PLATOON_COMMANDER",
        },
      },
    } as Awaited<ReturnType<typeof requireAuth>>);
    vi.mocked(listInterviewTemplates).mockResolvedValue([
      {
        id: "template-1",
        courseId: "course-1",
        code: "PLCDR_INIT",
        title: "PL CDR Initial Interview",
        allowMultiple: false,
        sortOrder: 1,
        semesters: [1],
      },
    ] as any);
    vi.mocked(listInterviewTemplatesHydrated).mockResolvedValue([
      {
        id: "template-1",
        courseId: "course-1",
        code: "TERM_POSTMID",
        title: "Post Mid Term Interview",
        allowMultiple: true,
        sortOrder: 2,
        semesters: [1],
        sections: [
          {
            id: "section-1",
            templateId: "template-1",
            title: "Main",
            description: null,
            sortOrder: 1,
            fields: [
              {
                id: "field-1",
                templateId: "template-1",
                sectionId: "section-1",
                groupId: null,
                key: "interviewedBy",
                label: "Interviewed By",
                fieldType: "text",
                sortOrder: 1,
                captureSignature: false,
                options: [],
              },
            ],
          },
        ],
        groups: [
          {
            id: "group-1",
            templateId: "template-1",
            sectionId: null,
            title: "Special",
            minRows: 0,
            maxRows: null,
            sortOrder: 1,
            fields: [
              {
                id: "field-2",
                templateId: "template-1",
                sectionId: null,
                groupId: "group-1",
                key: "summary",
                label: "Summary",
                fieldType: "textarea",
                sortOrder: 1,
                captureSignature: false,
                options: [],
              },
            ],
          },
        ],
      },
    ] as any);
  });

  it("lists plain interview templates by default", async () => {
    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/interview/templates?semester=1",
    });

    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].code).toBe("PLCDR_INIT");
    expect(listInterviewTemplates).toHaveBeenCalledWith({
      courseId: undefined,
      semester: 1,
      includeDeleted: false,
    });
    expect(listInterviewTemplatesHydrated).not.toHaveBeenCalled();
  });

  it("returns hydrated interview templates when requested", async () => {
    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/interview/templates?hydrate=true&semester=1",
    });

    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items[0].sections[0].fields[0].key).toBe("interviewedBy");
    expect(body.items[0].groups[0].fields[0].key).toBe("summary");
    expect(listInterviewTemplatesHydrated).toHaveBeenCalledWith({
      courseId: undefined,
      semester: 1,
      includeDeleted: false,
    });
    expect(listInterviewTemplates).not.toHaveBeenCalled();
  });
});
