import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/dashboard/data/appointments/route";
import * as authz from "@/app/lib/authz";
import * as cadetAppointmentsQueries from "@/app/db/queries/cadet-appointments";
import { makeJsonRequest } from "../utils/next";

const dbMocks = vi.hoisted(() => {
  const orderByMock = vi.fn();
  const whereMock = vi.fn(() => ({ orderBy: orderByMock }));
  const innerJoinMock = vi.fn(() => ({ innerJoin: innerJoinMock, where: whereMock }));
  const fromMock = vi.fn(() => ({ innerJoin: innerJoinMock, where: whereMock }));
  const selectMock = vi.fn(() => ({ from: fromMock }));

  return {
    orderByMock,
    whereMock,
    innerJoinMock,
    fromMock,
    selectMock,
  };
});

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => handler,
}));

vi.mock("@/app/lib/authz", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/app/db/queries/cadet-appointments", () => ({
  listActiveCadetAppointmentsForDashboard: vi.fn(),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: dbMocks.selectMock,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.selectMock.mockImplementation(() => ({ from: dbMocks.fromMock }));
  dbMocks.fromMock.mockImplementation(() => ({
    innerJoin: dbMocks.innerJoinMock,
    where: dbMocks.whereMock,
  }));
  dbMocks.innerJoinMock.mockImplementation(() => ({
    innerJoin: dbMocks.innerJoinMock,
    where: dbMocks.whereMock,
  }));
  dbMocks.whereMock.mockImplementation(() => ({ orderBy: dbMocks.orderByMock }));
});

describe("dashboard appointments route", () => {
  it("returns platoon cadet appointments for platoon commanders", async () => {
    vi.mocked(authz.requireAuth).mockResolvedValue({
      userId: "pl-cdr-1",
      roles: ["PLATOON_COMMANDER"],
      claims: {
        apt: {
          position: "PLATOON_COMMANDER",
          scope: {
            type: "PLATOON",
            id: "platoon-1",
          },
        },
      },
    } as Awaited<ReturnType<typeof authz.requireAuth>>);
    vi.mocked(
      cadetAppointmentsQueries.listActiveCadetAppointmentsForDashboard
    ).mockResolvedValue([
      {
        appointmentId: "cadet-apt-1",
        positionName: "Cadet Captain",
        officerName: "OC-01 Cadet One",
        ocNo: "OC-01",
        courseName: "TES 50",
        startsAt: new Date("2025-01-01T00:00:00.000Z"),
      },
    ]);

    const res = await GET(
      makeJsonRequest({
        method: "GET",
        path: "/api/v1/dashboard/data/appointments",
      }) as any
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.source).toBe("platoon-cadet");
    expect(body.items).toEqual([
      expect.objectContaining({
        appointmentId: "cadet-apt-1",
        positionName: "Cadet Captain",
        officerName: "OC-01 Cadet One",
        ocNo: "OC-01",
        courseName: "TES 50",
      }),
    ]);
    expect(
      cadetAppointmentsQueries.listActiveCadetAppointmentsForDashboard
    ).toHaveBeenCalledWith("platoon-1");
    expect(dbMocks.selectMock).not.toHaveBeenCalled();
  });

  it("returns admin appointments for non-platoon users", async () => {
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
    dbMocks.orderByMock.mockResolvedValue([
      {
        appointmentId: "admin-apt-1",
        positionName: "Adjutant",
        officerName: "Capt Admin",
        ocNo: null,
        courseName: null,
        startsAt: new Date("2025-01-10T00:00:00.000Z"),
      },
    ]);

    const res = await GET(
      makeJsonRequest({
        method: "GET",
        path: "/api/v1/dashboard/data/appointments",
      }) as any
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.source).toBe("admin");
    expect(body.items).toEqual([
      expect.objectContaining({
        appointmentId: "admin-apt-1",
        positionName: "Adjutant",
        officerName: "Capt Admin",
        ocNo: null,
        courseName: null,
      }),
    ]);
    expect(
      cadetAppointmentsQueries.listActiveCadetAppointmentsForDashboard
    ).not.toHaveBeenCalled();
    expect(dbMocks.selectMock).toHaveBeenCalledTimes(1);
  });
});
