import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: dbMock.select,
  },
}));

vi.mock("@/app/db/queries/oc-enrollments", () => ({
  getOrCreateActiveEnrollment: vi.fn(),
}));

vi.mock("@/app/db/queries/marksReviewWorkflow", () => ({
  listPublishedPtWorkflowSemesters: vi.fn(),
}));

import { getOrCreateActiveEnrollment } from "@/app/db/queries/oc-enrollments";
import { listPublishedPtWorkflowSemesters } from "@/app/db/queries/marksReviewWorkflow";
import { listOcPtScores } from "@/app/db/queries/physicalTrainingOc";

const activeEnrollment = {
  id: "11111111-1111-4111-8111-111111111111",
  ocId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  courseId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
};

function makeSelectChain(result: unknown[]) {
  const chain: any = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(async () => result),
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getOrCreateActiveEnrollment).mockResolvedValue(activeEnrollment as any);
});

describe("PT score published reads", () => {
  it("returns no PT scores for dossier reads when the semester workflow is not verified", async () => {
    vi.mocked(listPublishedPtWorkflowSemesters).mockResolvedValue(new Set());

    const rows = await listOcPtScores(activeEnrollment.ocId, 1);

    expect(rows).toEqual([]);
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it("loads PT scores when the semester workflow is verified", async () => {
    const scoreRows = [{ id: "score-row-1", marksScored: 24 }];
    vi.mocked(listPublishedPtWorkflowSemesters).mockResolvedValue(new Set([1]));
    dbMock.select.mockReturnValueOnce(makeSelectChain(scoreRows));

    const rows = await listOcPtScores(activeEnrollment.ocId, 1);

    expect(rows).toBe(scoreRows);
    expect(dbMock.select).toHaveBeenCalledTimes(1);
  });
});
