import { describe, expect, it } from "vitest";

import { buildServedHistory } from "@/lib/appointments/served-history";
import type { Appointment } from "@/app/lib/api/appointmentApi";

describe("appointment served history", () => {
  it("maps ended appointments into persisted served history entries ordered by latest handover", () => {
    const history = buildServedHistory([
      {
        id: "appointment-ended-earlier",
        userId: "user-1",
        username: "holder-1",
        positionId: "position-1",
        positionKey: "ADMIN",
        positionName: "Admin",
        scopeType: "GLOBAL",
        scopeId: null,
        platoonKey: null,
        platoonName: null,
        startsAt: "2026-04-01T00:00:00.000Z",
        endsAt: "2026-04-10T00:00:00.000Z",
        reason: "",
        deletedAt: null,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
      },
      {
        id: "appointment-active",
        userId: "user-2",
        username: "holder-2",
        positionId: "position-2",
        positionKey: "OC",
        positionName: "OC",
        scopeType: "GLOBAL",
        scopeId: null,
        platoonKey: null,
        platoonName: null,
        startsAt: "2026-04-11T00:00:00.000Z",
        endsAt: null,
        reason: "",
        deletedAt: null,
        createdAt: "2026-04-11T00:00:00.000Z",
        updatedAt: "2026-04-11T00:00:00.000Z",
      },
      {
        id: "appointment-ended-later",
        userId: "user-3",
        username: "holder-3",
        positionId: "position-3",
        positionKey: "DS_COORD",
        positionName: "DS COORD",
        scopeType: "GLOBAL",
        scopeId: null,
        platoonKey: null,
        platoonName: null,
        startsAt: "2026-04-05T00:00:00.000Z",
        endsAt: "2026-04-20T00:00:00.000Z",
        reason: "",
        deletedAt: null,
        createdAt: "2026-04-05T00:00:00.000Z",
        updatedAt: "2026-04-20T00:00:00.000Z",
      },
    ] as Appointment[]);

    expect(history).toEqual([
      {
        id: "appointment-ended-later",
        user: "holder-3",
        appointment: "DS COORD",
        fromDate: "2026-04-05T00:00:00.000Z",
        toDate: "2026-04-20T00:00:00.000Z",
      },
      {
        id: "appointment-ended-earlier",
        user: "holder-1",
        appointment: "Admin",
        fromDate: "2026-04-01T00:00:00.000Z",
        toDate: "2026-04-10T00:00:00.000Z",
      },
    ]);
  });
});
