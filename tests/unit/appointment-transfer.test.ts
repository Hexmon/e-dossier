import { describe, expect, it, vi } from "vitest";

import { transferAppointment } from "@/app/db/queries/appointment-transfer";

function buildSelectChain(rows: any[]) {
  const limit = vi.fn(async () => rows);
  const where = vi.fn(() => ({ limit }));
  const innerJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ where, innerJoin }));

  return { from };
}

describe("transferAppointment", () => {
  it("rejects a transfer that would overlap a future scheduled holder", async () => {
    const transaction = vi.fn();
    const selectResults = [
      [
        {
          id: "appointment-current",
          userId: "user-current",
          positionId: "position-1",
          assignment: "PRIMARY",
          scopeType: "GLOBAL",
          scopeId: null,
          startsAt: new Date("2026-04-01T00:00:00.000Z"),
          endsAt: null,
          deletedAt: null,
        },
      ],
      [{ id: "user-next", deletedAt: null }],
      [{ id: "position-1" }],
      [
        {
          id: "appointment-future",
          userId: "user-future",
          username: "future-holder",
          startsAt: new Date("2026-04-10T00:00:00.000Z"),
          endsAt: null,
        },
      ],
    ];
    const db = {
      select: vi.fn(() => buildSelectChain(selectResults.shift() ?? [])),
      transaction,
    };

    await expect(
      transferAppointment(
        {
          appointmentId: "appointment-current",
          adminId: "admin-1",
          newUserId: "user-next",
          prevEndsAt: new Date("2026-04-05T00:00:00.000Z"),
          newStartsAt: new Date("2026-04-05T00:00:00.000Z"),
        },
        db as any,
      ),
    ).rejects.toMatchObject({
      status: 409,
      code: "conflict",
      message: "Another active/overlapping appointment already exists for this position & scope",
    });

    expect(transaction).not.toHaveBeenCalled();
  });
});
