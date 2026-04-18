import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getCadetAppointments, POST as postCadetAppointment } from "@/app/api/v1/pl-cdr/cadet-appointments/route";
import {
  DELETE as deleteCadetAppointment,
  PATCH as patchCadetAppointment,
} from "@/app/api/v1/pl-cdr/cadet-appointments/[id]/route";
import { POST as transferCadetAppointment } from "@/app/api/v1/pl-cdr/cadet-appointments/[id]/transfer/route";
import { requirePlatoonCommanderScope } from "@/app/lib/platoon-commander-auth";
import * as cadetAppointmentsQueries from "@/app/db/queries/cadet-appointments";
import { createRouteContext, makeJsonRequest } from "../utils/next";

const auditLogMock = vi.fn(async () => undefined);

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
  AuditEventType: {
    API_REQUEST: "ACCESS.REQUEST",
    APPOINTMENT_CREATED: "APPOINTMENT.CREATE",
    APPOINTMENT_UPDATED: "APPOINTMENT.UPDATE",
    APPOINTMENT_DELETED: "APPOINTMENT.DELETE",
    APPOINTMENT_TRANSFERRED: "APPOINTMENT.TRANSFER",
  },
  AuditResourceType: {
    API: "api",
    APPOINTMENT: "appointment",
  },
}));

vi.mock("@/app/lib/platoon-commander-auth", () => ({
  requirePlatoonCommanderScope: vi.fn(),
}));

vi.mock("@/app/db/queries/cadet-appointments", () => ({
  getCadetAppointmentsDashboard: vi.fn(),
  createCadetAppointment: vi.fn(),
  getCadetAppointmentById: vi.fn(),
  updateCadetAppointment: vi.fn(),
  deleteCadetAppointment: vi.fn(),
  transferCadetAppointment: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePlatoonCommanderScope).mockResolvedValue({
    userId: "pl-cdr-1",
    platoonId: "platoon-1",
    position: "PLATOON_COMMANDER",
    roles: ["PLATOON_COMMANDER"],
  });
});

describe("platoon commander cadet appointments routes", () => {
  it("GET /api/v1/pl-cdr/cadet-appointments returns platoon-scoped dashboard data", async () => {
    vi.mocked(cadetAppointmentsQueries.getCadetAppointmentsDashboard).mockResolvedValue({
      platoon: { id: "platoon-1", key: "ARJUN", name: "Arjun" },
      cadets: [{ id: "cadet-1", name: "Cadet One", ocNo: "OC-01", status: "ACTIVE" }],
      activeAppointments: [],
      historyAppointments: [],
    });

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/pl-cdr/cadet-appointments",
    });

    const res = await getCadetAppointments(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.platoon.name).toBe("Arjun");
    expect(body.cadets).toHaveLength(1);
    expect(cadetAppointmentsQueries.getCadetAppointmentsDashboard).toHaveBeenCalledWith("platoon-1");
  });

  it("POST /api/v1/pl-cdr/cadet-appointments creates a cadet appointment", async () => {
    vi.mocked(cadetAppointmentsQueries.createCadetAppointment).mockResolvedValue({
      id: "cadet-apt-1",
      cadetId: "11111111-1111-4111-8111-111111111111",
      cadetName: "Cadet One",
      cadetOcNo: "OC-01",
      platoonId: "platoon-1",
      platoonName: "Arjun",
      appointmentName: "Cadet Captain",
      startsAt: new Date("2025-01-01T00:00:00.000Z"),
      endsAt: null,
      reason: "Section appointment",
      appointedByName: "PL CDR",
      endedByName: null,
      deletedAt: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    });

    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/pl-cdr/cadet-appointments",
      body: {
        cadetId: "11111111-1111-4111-8111-111111111111",
        appointmentName: "Cadet Captain",
        startsAt: "2025-01-01T00:00:00.000Z",
        reason: "Section appointment",
      },
    });

    const res = await postCadetAppointment(req as any);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.appointmentName).toBe("Cadet Captain");
    expect(cadetAppointmentsQueries.createCadetAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        platoonId: "platoon-1",
        actorUserId: "pl-cdr-1",
      })
    );
  });

  it("PATCH /api/v1/pl-cdr/cadet-appointments/[id] updates a cadet appointment", async () => {
    vi.mocked(cadetAppointmentsQueries.updateCadetAppointment).mockResolvedValue({
      before: {
        id: "22222222-2222-4222-8222-222222222222",
        cadetId: "cadet-1",
        platoonId: "platoon-1",
        appointmentName: "Cadet Captain",
        startsAt: new Date("2025-01-01T00:00:00.000Z"),
        endsAt: null,
        appointedBy: "pl-cdr-1",
        endedBy: null,
        reason: null,
        deletedAt: null,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-01-01T00:00:00.000Z"),
      },
      after: {
        id: "22222222-2222-4222-8222-222222222222",
        cadetId: "cadet-2",
        cadetName: "Cadet Two",
        cadetOcNo: "OC-02",
        platoonId: "platoon-1",
        platoonName: "Arjun",
        appointmentName: "Cadet Captain",
        startsAt: new Date("2025-01-02T00:00:00.000Z"),
        endsAt: null,
        reason: "Updated",
        appointedByName: "PL CDR",
        endedByName: null,
        deletedAt: null,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-01-02T00:00:00.000Z"),
      },
    });

    const req = makeJsonRequest({
      method: "PATCH",
      path: "/api/v1/pl-cdr/cadet-appointments/22222222-2222-4222-8222-222222222222",
      body: {
        cadetId: "33333333-3333-4333-8333-333333333333",
        appointmentName: "Cadet Captain",
        startsAt: "2025-01-02T00:00:00.000Z",
        reason: "Updated",
      },
    });

    const res = await patchCadetAppointment(
      req as any,
      createRouteContext({ id: "22222222-2222-4222-8222-222222222222" })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.cadetName).toBe("Cadet Two");
  });

  it("DELETE /api/v1/pl-cdr/cadet-appointments/[id] deletes a cadet appointment", async () => {
    vi.mocked(cadetAppointmentsQueries.deleteCadetAppointment).mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      cadetId: "cadet-1",
      platoonId: "platoon-1",
      appointmentName: "Cadet Captain",
      startsAt: new Date("2025-01-01T00:00:00.000Z"),
      endsAt: null,
      appointedBy: "pl-cdr-1",
      endedBy: null,
      reason: null,
      deletedAt: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    });

    const req = makeJsonRequest({
      method: "DELETE",
      path: "/api/v1/pl-cdr/cadet-appointments/22222222-2222-4222-8222-222222222222",
    });

    const res = await deleteCadetAppointment(
      req as any,
      createRouteContext({ id: "22222222-2222-4222-8222-222222222222" })
    );

    expect(res.status).toBe(200);
    expect(cadetAppointmentsQueries.deleteCadetAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentId: "22222222-2222-4222-8222-222222222222" })
    );
  });

  it("POST /api/v1/pl-cdr/cadet-appointments/[id]/transfer transfers a cadet appointment", async () => {
    vi.mocked(cadetAppointmentsQueries.transferCadetAppointment).mockResolvedValue({
      ended: {
        id: "22222222-2222-4222-8222-222222222222",
        cadetId: "cadet-1",
        platoonId: "platoon-1",
        appointmentName: "Cadet Captain",
        startsAt: new Date("2025-01-01T00:00:00.000Z"),
        endsAt: new Date("2025-01-05T00:00:00.000Z"),
        appointedBy: "pl-cdr-1",
        endedBy: "pl-cdr-1",
        reason: null,
        deletedAt: null,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-01-05T00:00:00.000Z"),
      },
      next: {
        id: "cadet-apt-2",
        cadetId: "cadet-2",
        cadetName: "Cadet Two",
        cadetOcNo: "OC-02",
        platoonId: "platoon-1",
        platoonName: "Arjun",
        appointmentName: "Cadet Captain",
        startsAt: new Date("2025-01-06T00:00:00.000Z"),
        endsAt: null,
        reason: "Handover",
        appointedByName: "PL CDR",
        endedByName: null,
        deletedAt: null,
        createdAt: new Date("2025-01-06T00:00:00.000Z"),
        updatedAt: new Date("2025-01-06T00:00:00.000Z"),
      },
    });

    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/pl-cdr/cadet-appointments/22222222-2222-4222-8222-222222222222/transfer",
      body: {
        newCadetId: "33333333-3333-4333-8333-333333333333",
        prevEndsAt: "2025-01-05T00:00:00.000Z",
        newStartsAt: "2025-01-06T00:00:00.000Z",
        reason: "Handover",
      },
    });

    const res = await transferCadetAppointment(
      req as any,
      createRouteContext({ id: "22222222-2222-4222-8222-222222222222" })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.newAppointment.cadetName).toBe("Cadet Two");
  });
});
