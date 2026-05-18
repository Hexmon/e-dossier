import { beforeEach, describe, expect, it, vi } from "vitest";

const { transactionMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    transaction: transactionMock,
  },
}));

vi.mock("@/app/lib/bootstrap/templates/appointment/default.v1.json", () => ({
  default: {
    module: "appointment",
    version: "test",
    profile: "default",
    positions: [
      {
        key: "ADMIN",
        displayName: "Admin",
        defaultScope: "GLOBAL",
        singleton: true,
        description: null,
      },
    ],
    assignments: [
      {
        username: "admin@army.mil",
        positionKey: "ADMIN",
        scopeType: "GLOBAL",
      },
    ],
  },
}));

import { applyAppointmentTemplateProfile } from "@/app/lib/bootstrap/appointment-template";

function buildSelectChain(rows: any[]) {
  const limit = vi.fn(async () => rows);
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ limit, orderBy }));
  const from = vi.fn(() => ({ where }));

  return { from };
}

describe("applyAppointmentTemplateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not overwrite an occupied appointment slot when applying defaults", async () => {
    const update = vi.fn();
    const insert = vi.fn();
    const selectResults = [
      [
        {
          id: "position-1",
          displayName: "Admin",
          defaultScope: "GLOBAL",
          singleton: true,
          description: null,
        },
      ],
      [{ id: "target-user" }],
      [
        {
          id: "appointment-existing",
          userId: "other-user",
          scopeType: "GLOBAL",
          scopeId: null,
          startsAt: new Date("2026-04-01T00:00:00.000Z"),
          reason: "manual assignment",
        },
      ],
    ];
    const tx = {
      select: vi.fn(() => buildSelectChain(selectResults.shift() ?? [])),
      insert,
      update,
    };

    transactionMock.mockImplementationOnce(async (callback: (tx: any) => Promise<void>) => {
      await callback(tx);
    });

    const result = await applyAppointmentTemplateProfile();

    expect(result.createdCount).toBe(0);
    expect(result.updatedCount).toBe(0);
    expect(result.skippedCount).toBe(2);
    expect(result.stats.assignments.skipped).toBe(1);
    expect(result.warnings).toEqual([
      'Skipped assignment for "admin@army.mil" because position "ADMIN" already has an active or scheduled holder for GLOBAL scope.',
    ]);
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("skips default holder assignment without warning when the user account is not present", async () => {
    const update = vi.fn();
    const insert = vi.fn();
    const selectResults = [
      [
        {
          id: "position-1",
          displayName: "Admin",
          defaultScope: "GLOBAL",
          singleton: true,
          description: null,
        },
      ],
      [],
    ];
    const tx = {
      select: vi.fn(() => buildSelectChain(selectResults.shift() ?? [])),
      insert,
      update,
    };

    transactionMock.mockImplementationOnce(async (callback: (tx: any) => Promise<void>) => {
      await callback(tx);
    });

    const result = await applyAppointmentTemplateProfile();

    expect(result.createdCount).toBe(0);
    expect(result.updatedCount).toBe(0);
    expect(result.skippedCount).toBe(2);
    expect(result.stats.assignments.skipped).toBe(1);
    expect(result.warnings).toEqual([]);
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
