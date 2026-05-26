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

const peerEnrollment = {
  id: "22222222-2222-4222-8222-222222222222",
  ocId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  courseId: activeEnrollment.courseId,
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

function makeTermOneTemplate() {
  return {
    courseId: activeEnrollment.courseId,
    semester: 1,
    types: [
      {
        id: "type-ppt",
        maxTotalMarks: 50,
        tasks: [
          {
            id: "task-run",
            maxMarks: 80,
            attempts: [
              {
                grades: [
                  {
                    scoreId: "score-run",
                    maxMarks: 80,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "type-ipet",
        maxTotalMarks: 25,
        tasks: [
          {
            id: "task-pushups",
            maxMarks: 40,
            attempts: [
              {
                grades: [
                  {
                    scoreId: "score-pushups",
                    maxMarks: 40,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    motivationFields: [],
  };
}

function makeEmptyTemplate(semester: number) {
  return {
    courseId: activeEnrollment.courseId,
    semester,
    types: [],
    motivationFields: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.selectQueue = [];
  dbMock.execute.mockResolvedValue({ rows: [] });
  dbMock.select.mockImplementation(() => {
    const item = dbMock.selectQueue.shift();
    if (!item) throw new Error("Unexpected db.select call");
    return makeSelectChain(item);
  });
  vi.mocked(getOrCreateActiveEnrollment).mockResolvedValue(activeEnrollment as any);
  vi.mocked(getPtTemplateByCourseSemester).mockImplementation(async (_courseId, semester) =>
    semester === 1 ? makeTermOneTemplate() as any : makeEmptyTemplate(semester) as any,
  );
  vi.mocked(listPublishedPtWorkflowSemesters).mockResolvedValue(new Set([1, 2, 3, 4, 5, 6]));
});

describe("performance graph ODT PT totals", () => {
  it("caps ODT cadet and course totals to the sum of configured PT type totals", async () => {
    dbMock.selectQueue.push(
      { result: [activeEnrollment, peerEnrollment] },
      { result: [] },
      { result: [] },
      {
        result: [
          {
            enrollmentId: activeEnrollment.id,
            semester: 1,
            ptTaskScoreId: "score-run",
            ptTaskId: "task-run",
            marksScored: 80,
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
          {
            enrollmentId: activeEnrollment.id,
            semester: 1,
            ptTaskScoreId: "score-pushups",
            ptTaskId: "task-pushups",
            marksScored: 40,
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
          {
            enrollmentId: peerEnrollment.id,
            semester: 1,
            ptTaskScoreId: "score-run",
            ptTaskId: "task-run",
            marksScored: 30,
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
      },
      { result: [] },
    );

    const data = await getPerformanceGraphData(activeEnrollment.ocId);

    expect(data.odt.maxMarks).toEqual([75, 0, 0, 0, 0, 0]);
    expect(data.odt.cadet).toEqual([75, 0, 0, 0, 0, 0]);
    expect(data.odt.courseAverage).toEqual([52.5, 0, 0, 0, 0, 0]);
    expect(data.odt.cadetTermPresence).toEqual([true, false, false, false, false, false]);
  });

  it("shows zero ODT marks when PT workflow data is not verified and published", async () => {
    vi.mocked(listPublishedPtWorkflowSemesters).mockResolvedValue(new Set([2, 3, 4, 5, 6]));
    dbMock.selectQueue.push(
      { result: [activeEnrollment, peerEnrollment] },
      { result: [] },
      { result: [] },
      {
        result: [
          {
            enrollmentId: activeEnrollment.id,
            semester: 1,
            ptTaskScoreId: "score-run",
            ptTaskId: "task-run",
            marksScored: 80,
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
      },
      { result: [] },
    );

    const data = await getPerformanceGraphData(activeEnrollment.ocId);

    expect(data.odt.maxMarks).toEqual([75, 0, 0, 0, 0, 0]);
    expect(data.odt.cadet).toEqual([0, 0, 0, 0, 0, 0]);
    expect(data.odt.courseAverage).toEqual([0, 0, 0, 0, 0, 0]);
    expect(data.odt.cadetTermPresence[0]).toBe(false);
  });
});
