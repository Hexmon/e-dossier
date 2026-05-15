import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/setup-status", () => ({
  getSetupStatus: vi.fn(),
  isSetupStatusUnavailable: (status: any) => status.availability?.ok === false,
}));

import { GET as getSetupStatusRoute } from "@/app/api/v1/setup/status/route";
import { getSetupStatus } from "@/app/lib/setup-status";
import { makeJsonRequest, createRouteContext } from "../utils/next";

describe("GET /api/v1/setup/status", () => {
  it("returns fresh-install bootstrap-required status", async () => {
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: true,
      setupComplete: false,
      nextStep: "superAdmin",
      counts: {
        activeSuperAdmins: 0,
        availableAppointmentPositions: 0,
        activeOperationalAppointments: 0,
        activePlatoons: 0,
        activeCourses: 0,
        activeOfferings: 0,
        activeOCs: 0,
        activeHierarchyNodes: 1,
        activeRootNodes: 1,
        missingPlatoonHierarchyNodes: 0,
      },
      steps: {
        superAdmin: { status: "pending", complete: false },
        platoons: { status: "blocked", complete: false },
        appointments: { status: "blocked", complete: false },
        hierarchy: { status: "blocked", complete: false },
        courses: { status: "blocked", complete: false },
        offerings: { status: "blocked", complete: false },
        ocs: { status: "blocked", complete: false },
      },
    });

    const req = makeJsonRequest({ method: "GET", path: "/api/v1/setup/status" });
    const res = await getSetupStatusRoute(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.setup.bootstrapRequired).toBe(true);
    expect(body.setup.nextStep).toBe("superAdmin");
    expect(body.setup.counts.availableAppointmentPositions).toBe(0);
  });

  it("returns partial setup progress after bootstrap", async () => {
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
      setupComplete: false,
      nextStep: "offerings",
      counts: {
        activeSuperAdmins: 1,
        availableAppointmentPositions: 9,
        activeOperationalAppointments: 1,
        activePlatoons: 2,
        activeCourses: 1,
        activeOfferings: 0,
        activeOCs: 0,
        activeHierarchyNodes: 3,
        activeRootNodes: 1,
        missingPlatoonHierarchyNodes: 0,
      },
      steps: {
        superAdmin: { status: "complete", complete: true },
        platoons: { status: "complete", complete: true },
        appointments: { status: "complete", complete: true },
        hierarchy: { status: "complete", complete: true },
        courses: { status: "complete", complete: true },
        offerings: { status: "pending", complete: false },
        ocs: { status: "blocked", complete: false },
      },
    });

    const req = makeJsonRequest({ method: "GET", path: "/api/v1/setup/status" });
    const res = await getSetupStatusRoute(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.setup.bootstrapRequired).toBe(false);
    expect(body.setup.setupComplete).toBe(false);
    expect(body.setup.nextStep).toBe("offerings");
    expect(body.setup.counts.availableAppointmentPositions).toBe(9);
  });

  it("returns fully complete setup state", async () => {
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
      setupComplete: true,
      nextStep: null,
      counts: {
        activeSuperAdmins: 1,
        availableAppointmentPositions: 9,
        activeOperationalAppointments: 1,
        activePlatoons: 2,
        activeCourses: 1,
        activeOfferings: 3,
        activeOCs: 12,
        activeHierarchyNodes: 3,
        activeRootNodes: 1,
        missingPlatoonHierarchyNodes: 0,
      },
      steps: {
        superAdmin: { status: "complete", complete: true },
        platoons: { status: "complete", complete: true },
        appointments: { status: "complete", complete: true },
        hierarchy: { status: "complete", complete: true },
        courses: { status: "complete", complete: true },
        offerings: { status: "complete", complete: true },
        ocs: { status: "complete", complete: true },
      },
    });

    const req = makeJsonRequest({ method: "GET", path: "/api/v1/setup/status" });
    const res = await getSetupStatusRoute(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.setup.setupComplete).toBe(true);
    expect(body.setup.nextStep).toBeNull();
  });

  it("returns degraded setup status without exposing database internals", async () => {
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
      setupComplete: false,
      nextStep: null,
      availability: {
        ok: false,
        code: "database_unavailable",
        message: "Database is temporarily unavailable. Please try again after the service is restored.",
        retryable: true,
      },
      counts: {
        activeSuperAdmins: 0,
        availableAppointmentPositions: 0,
        activeOperationalAppointments: 0,
        activePlatoons: 0,
        activeCourses: 0,
        activeOfferings: 0,
        activeOCs: 0,
        activeHierarchyNodes: 0,
        activeRootNodes: 0,
        missingPlatoonHierarchyNodes: 0,
      },
      steps: {
        superAdmin: { status: "blocked", complete: false },
        platoons: { status: "blocked", complete: false },
        appointments: { status: "blocked", complete: false },
        hierarchy: { status: "blocked", complete: false },
        courses: { status: "blocked", complete: false },
        offerings: { status: "blocked", complete: false },
        ocs: { status: "blocked", complete: false },
      },
    });

    const req = makeJsonRequest({ method: "GET", path: "/api/v1/setup/status" });
    const res = await getSetupStatusRoute(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.setup.availability).toMatchObject({
      ok: false,
      code: "database_unavailable",
      retryable: true,
    });
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(body)).not.toContain("select count");
  });
});
