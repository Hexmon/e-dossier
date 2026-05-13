import { describe, expect, it, vi } from "vitest";

import { syncOcLifecycleFromCadet } from "@/app/db/queries/oc-lifecycle";
import {
  ocCourseEnrollments,
  ocPreCommission,
  ocReconciliationAudit,
} from "@/app/db/schema/training/oc";

function fakeTx(selectResults: any[][]) {
  const inserts: Array<{ table: unknown; payload: unknown }> = [];
  const updates: Array<{ table: unknown; payload: unknown }> = [];

  const tx = {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: async () => selectResults.shift() ?? [],
        }),
      }),
    })),
    insert: vi.fn((table: unknown) => ({
      values: async (payload: unknown) => {
        inserts.push({ table, payload });
      },
    })),
    update: vi.fn((table: unknown) => ({
      set: (payload: unknown) => ({
        where: async () => {
          updates.push({ table, payload });
        },
      }),
    })),
  };

  return { tx, inserts, updates };
}

describe("syncOcLifecycleFromCadet", () => {
  it("repairs an OC that is missing active enrollment and pre-commission snapshot rows", async () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const { tx, inserts } = fakeTx([
      [{
        id: "oc-1",
        courseId: "course-1",
        branch: "O",
        platoonId: "platoon-1",
        relegatedToCourseId: null,
        relegatedOn: null,
        withdrawnOn: null,
        createdAt,
      }],
      [],
      [],
    ]);

    await syncOcLifecycleFromCadet("oc-1", { actorUserId: "admin-1" }, tx as any);

    expect(inserts).toEqual([
      expect.objectContaining({
        table: ocCourseEnrollments,
        payload: expect.objectContaining({
          ocId: "oc-1",
          courseId: "course-1",
          status: "ACTIVE",
          origin: "BASELINE",
          currentSemester: 1,
          startedOn: createdAt,
          createdByUserId: "admin-1",
        }),
      }),
      expect.objectContaining({
        table: ocPreCommission,
        payload: expect.objectContaining({
          ocId: "oc-1",
          courseId: "course-1",
          branch: "O",
          platoonId: "platoon-1",
        }),
      }),
    ]);
  });

  it("audits conflicting compatibility values before syncing them", async () => {
    const { tx, inserts, updates } = fakeTx([
      [{
        id: "oc-1",
        courseId: "course-new",
        branch: "E",
        platoonId: "platoon-new",
        relegatedToCourseId: null,
        relegatedOn: null,
        withdrawnOn: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      }],
      [{ id: "enrollment-1", courseId: "course-old" }],
      [{
        ocId: "oc-1",
        courseId: "course-old",
        branch: "O",
        platoonId: "platoon-old",
        relegatedToCourseId: null,
        relegatedOn: null,
        withdrawnOn: null,
      }],
    ]);

    await syncOcLifecycleFromCadet("oc-1", {
      actorUserId: "admin-1",
      reason: "test_sync",
    }, tx as any);

    const auditInserts = inserts.filter((entry) => entry.table === ocReconciliationAudit);
    expect(auditInserts).toHaveLength(2);
    expect(auditInserts[0].payload).toEqual([
      expect.objectContaining({
        ocId: "oc-1",
        conflictType: "ACTIVE_ENROLLMENT_COURSE_MISMATCH",
        fieldName: "course_id",
        sourceValue: "course-new",
        targetValue: "course-old",
        resolution: "test_sync",
      }),
    ]);
    expect(auditInserts[1].payload).toEqual(expect.arrayContaining([
      expect.objectContaining({
        conflictType: "PRE_COMMISSION_SNAPSHOT_MISMATCH",
        fieldName: "course_id",
        sourceValue: "course-new",
        targetValue: "course-old",
      }),
      expect.objectContaining({
        fieldName: "branch",
        sourceValue: "E",
        targetValue: "O",
      }),
      expect.objectContaining({
        fieldName: "platoon_id",
        sourceValue: "platoon-new",
        targetValue: "platoon-old",
      }),
    ]));
    expect(updates).toEqual([
      expect.objectContaining({
        table: ocCourseEnrollments,
        payload: expect.objectContaining({ courseId: "course-new" }),
      }),
      expect.objectContaining({
        table: ocPreCommission,
        payload: expect.objectContaining({
          courseId: "course-new",
          branch: "E",
          platoonId: "platoon-new",
        }),
      }),
    ]);
  });
});
