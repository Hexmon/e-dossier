import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  execute: vi.fn(),
  select: vi.fn(),
  selectQueue: [] as Array<{ result?: unknown; error?: unknown }>,
}));

vi.mock("@/app/db/client", () => ({
  db: {
    execute: dbMock.execute,
    select: dbMock.select,
  },
}));

vi.mock("@/app/db/queries/oc-enrollments", () => ({
  getOrCreateActiveEnrollment: vi.fn(),
}));

vi.mock("@/app/db/queries/physicalTraining", () => ({
  getPtTemplateByCourseSemester: vi.fn(),
}));

vi.mock("@/app/db/queries/marksReviewWorkflow", () => ({
  listPublishedPtWorkflowSemesters: vi.fn(),
}));

import { getOrCreateActiveEnrollment } from "@/app/db/queries/oc-enrollments";
import { getPtTemplateByCourseSemester } from "@/app/db/queries/physicalTraining";
import { listPublishedPtWorkflowSemesters } from "@/app/db/queries/marksReviewWorkflow";
import { getPerformanceGraphData } from "@/app/db/queries/performance-graph";

const activeEnrollment = {
  id: "11111111-1111-4111-8111-111111111111",
  ocId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  courseId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
};

function makeSelectChain(item: { result?: unknown; error?: unknown }) {
  const chain: any = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(async () => {
      if (item.error) throw item.error;
      return item.result;
    }),
  };
  return chain;
}

function missingEnrollmentColumnError() {
  return {
    cause: {
      code: "42703",
      message: 'column "enrollment_id" does not exist',
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.selectQueue = [];
  dbMock.select.mockImplementation(() => {
    const item = dbMock.selectQueue.shift();
    if (!item) throw new Error("Unexpected db.select call");
    return makeSelectChain(item);
  });
  vi.mocked(getOrCreateActiveEnrollment).mockResolvedValue(activeEnrollment as any);
  vi.mocked(getPtTemplateByCourseSemester).mockImplementation(async (_courseId, semester) => ({
    courseId: activeEnrollment.courseId,
    semester,
    types: [],
    motivationFields: [],
  } as any));
  vi.mocked(listPublishedPtWorkflowSemesters).mockResolvedValue(new Set([1, 2, 3, 4, 5, 6]));
});

describe("performance graph medical data fallback", () => {
  it("loads medical category rows by OC when the legacy table has no enrollment_id column", async () => {
    dbMock.selectQueue.push(
      {
        result: [
          activeEnrollment,
          {
            id: "22222222-2222-4222-8222-222222222222",
            ocId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          },
        ],
      },
      { result: [] },
      { result: [] },
      { result: [] },
      { result: [] },
    );
    dbMock.execute
      .mockRejectedValueOnce(missingEnrollmentColumnError())
      .mockResolvedValueOnce({
        rows: [
          {
            ocId: activeEnrollment.ocId,
            semester: 1,
            absence: "4 days",
            catFrom: null,
            catTo: null,
            mhFrom: null,
            mhTo: null,
          },
          {
            ocId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            semester: 1,
            absence: "2 days",
            catFrom: null,
            catTo: null,
            mhFrom: null,
            mhTo: null,
          },
        ],
      });

    const data = await getPerformanceGraphData(activeEnrollment.ocId);

    expect(data.medical.cadet).toEqual([4, 0, 0, 0, 0, 0]);
    expect(data.medical.courseAverage).toEqual([3, 0, 0, 0, 0, 0]);
    expect(data.medical.cadetTermPresence).toEqual([true, false, false, false, false, false]);
    expect(dbMock.execute).toHaveBeenCalledTimes(2);
  });
});
