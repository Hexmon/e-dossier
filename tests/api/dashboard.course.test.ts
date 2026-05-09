import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/dashboard/data/course/route";
import * as authz from "@/app/lib/authz";
import { makeJsonRequest } from "../utils/next";

type CourseDashboardRow = {
  courseId: string;
  courseCode: string;
  strength: number;
  currentSemester: number;
};

const dbMocks = vi.hoisted(() => {
  let countResult: Array<{ count: number }> = [{ count: 0 }];
  let rowsResult: CourseDashboardRow[] = [];

  const makeThenable = <T,>(result: T) => ({
    then(onFulfilled: (value: T) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  });

  const countWhereMock = vi.fn(() => makeThenable(countResult));
  const countLeftJoinMock = vi.fn(() => ({ where: countWhereMock }));
  const countFromMock = vi.fn(() => ({ leftJoin: countLeftJoinMock }));

  const rowsOffsetMock = vi.fn(() => makeThenable(rowsResult));
  const rowsLimitMock = vi.fn(() => ({ offset: rowsOffsetMock }));
  const rowsOrderByMock = vi.fn(() => ({ limit: rowsLimitMock }));
  const rowsGroupByMock = vi.fn(() => ({ orderBy: rowsOrderByMock }));
  const rowsWhereMock = vi.fn(() => ({ groupBy: rowsGroupByMock }));
  const rowsSecondLeftJoinMock = vi.fn(() => ({ where: rowsWhereMock }));
  const rowsFirstLeftJoinMock = vi.fn(() => ({ leftJoin: rowsSecondLeftJoinMock }));
  const rowsFromMock = vi.fn(() => ({ leftJoin: rowsFirstLeftJoinMock }));

  const selectMock = vi.fn();

  return {
    countFromMock,
    countLeftJoinMock,
    countWhereMock,
    rowsFromMock,
    rowsFirstLeftJoinMock,
    rowsSecondLeftJoinMock,
    rowsWhereMock,
    rowsGroupByMock,
    rowsOrderByMock,
    rowsLimitMock,
    rowsOffsetMock,
    selectMock,
    setResults(nextCountResult: Array<{ count: number }>, nextRowsResult: CourseDashboardRow[]) {
      countResult = nextCountResult;
      rowsResult = nextRowsResult;
    },
    reset() {
      selectMock
        .mockReset()
        .mockImplementationOnce(() => ({ from: countFromMock }))
        .mockImplementationOnce(() => ({ from: rowsFromMock }));
      countFromMock.mockClear();
      countLeftJoinMock.mockClear();
      countWhereMock.mockClear();
      rowsFromMock.mockClear();
      rowsFirstLeftJoinMock.mockClear();
      rowsSecondLeftJoinMock.mockClear();
      rowsWhereMock.mockClear();
      rowsGroupByMock.mockClear();
      rowsOrderByMock.mockClear();
      rowsLimitMock.mockClear();
      rowsOffsetMock.mockClear();
      countResult = [{ count: 0 }];
      rowsResult = [];
    },
  };
});

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => handler,
}));

vi.mock("@/app/lib/authz", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: dbMocks.selectMock,
  },
}));

const dashboardCoursesPath = "/api/v1/dashboard/data/course";

function mockGlobalAuth() {
  vi.mocked(authz.requireAuth).mockResolvedValue({
    userId: "admin-1",
    roles: ["ADMIN"],
    claims: {
      apt: {
        position: "ADMIN",
        scope: {
          type: "GLOBAL",
          id: null,
        },
      },
    },
  } as Awaited<ReturnType<typeof authz.requireAuth>>);
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.reset();
  mockGlobalAuth();
});

describe("dashboard courses route", () => {
  it("returns a backend-paginated course page capped at five rows", async () => {
    dbMocks.setResults(
      [{ count: 12 }],
      [
        { courseId: "course-6", courseCode: "TES-56", strength: 44, currentSemester: 2 },
        { courseId: "course-7", courseCode: "TES-57", strength: 43, currentSemester: 3 },
        { courseId: "course-8", courseCode: "TES-58", strength: 42, currentSemester: 4 },
        { courseId: "course-9", courseCode: "TES-59", strength: 41, currentSemester: 5 },
        { courseId: "course-10", courseCode: "TES-60", strength: 40, currentSemester: 6 },
      ],
    );

    const req = makeJsonRequest({
      method: "GET",
      path: `${dashboardCoursesPath}?page=2&limit=20`,
    });
    const res = await GET(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(5);
    expect(body.items[0]).toEqual(
      expect.objectContaining({
        courseId: "course-6",
        courseCode: "TES-56",
      }),
    );
    expect(body.count).toBe(12);
    expect(body.pagination).toEqual({
      page: 2,
      pageSize: 5,
      totalItems: 12,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: true,
    });
    expect(dbMocks.rowsLimitMock).toHaveBeenCalledWith(5);
    expect(dbMocks.rowsOffsetMock).toHaveBeenCalledWith(5);
  });

  it("clamps an out-of-range page to the last available page", async () => {
    dbMocks.setResults(
      [{ count: 7 }],
      [
        { courseId: "course-6", courseCode: "TES-56", strength: 44, currentSemester: 2 },
        { courseId: "course-7", courseCode: "TES-57", strength: 43, currentSemester: 3 },
      ],
    );

    const req = makeJsonRequest({
      method: "GET",
      path: `${dashboardCoursesPath}?page=99&limit=5`,
    });
    const res = await GET(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pagination).toEqual({
      page: 2,
      pageSize: 5,
      totalItems: 7,
      totalPages: 2,
      hasPreviousPage: true,
      hasNextPage: false,
    });
    expect(dbMocks.rowsLimitMock).toHaveBeenCalledWith(5);
    expect(dbMocks.rowsOffsetMock).toHaveBeenCalledWith(5);
  });
});
