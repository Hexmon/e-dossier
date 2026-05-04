import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/admin/training-camps/route";
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
    TRAINING_CAMP_CREATED: "training_camp.created",
  },
  AuditResourceType: {
    TRAINING_CAMP: "training_camp",
  },
}));

vi.mock("@/app/lib/authz", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/app/db/queries/trainingCamps", () => ({
  listTrainingCamps: vi.fn(),
  createTrainingCamp: vi.fn(),
  countActiveTrainingCampsBySemester: vi.fn(),
  getTrainingCampSettings: vi.fn(),
}));

import { requireAuth } from "@/app/lib/authz";
import { listTrainingCamps } from "@/app/db/queries/trainingCamps";

describe("admin training camps API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: {},
    } as Awaited<ReturnType<typeof requireAuth>>);
    vi.mocked(listTrainingCamps).mockResolvedValue([
      {
        id: "camp-1",
        courseId: "11111111-1111-4111-8111-111111111111",
        name: "Camp Greenhorn",
        semester: 1,
        sortOrder: 1,
        maxTotalMarks: 100,
        activities: [],
      },
    ] as any);
  });

  it("lists course training camps by default", async () => {
    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/training-camps?courseId=11111111-1111-4111-8111-111111111111&includeActivities=true",
    });

    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(listTrainingCamps).toHaveBeenCalledWith({
      courseId: "11111111-1111-4111-8111-111111111111",
      semester: undefined,
      includeActivities: true,
      includeDeleted: false,
    });
  });

  it("falls back to legacy global training camps when requested", async () => {
    vi.mocked(listTrainingCamps)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "camp-global",
          courseId: null,
          name: "Camp Greenhorn",
          semester: 1,
          sortOrder: 1,
          maxTotalMarks: 100,
          activities: [],
        },
      ] as any);

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/training-camps?courseId=11111111-1111-4111-8111-111111111111&semester=1&includeActivities=true&fallbackToLegacyGlobal=true",
    });

    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].courseId).toBeNull();
    expect(listTrainingCamps).toHaveBeenNthCalledWith(1, {
      courseId: "11111111-1111-4111-8111-111111111111",
      semester: 1,
      includeActivities: true,
      includeDeleted: false,
    });
    expect(listTrainingCamps).toHaveBeenNthCalledWith(2, {
      courseId: null,
      semester: 1,
      includeActivities: true,
      includeDeleted: false,
    });
  });
});
