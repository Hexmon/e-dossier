import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { UserListItem } from "@/components/users/UserCard";
import type { Appointment } from "@/app/lib/api/appointmentApi";

const baseAppointment: Appointment = {
  id: "appointment-1",
  userId: "user-1",
  username: "holder",
  positionId: "position-1",
  positionKey: "ADMIN",
  positionName: "Admin",
  scopeType: "GLOBAL",
  scopeId: null,
  platoonKey: null,
  platoonName: null,
  startsAt: "2026-04-04T00:00:00.000Z",
  endsAt: null,
  reason: "Initial assignment",
  deletedAt: null,
  createdAt: "2026-04-04T00:00:00.000Z",
  updatedAt: "2026-04-04T00:00:00.000Z",
};

const FULL_SUITE_RENDER_TIMEOUT_MS = 15_000;

describe("protected admin UI actions", () => {
  it("keeps protected users viewable but disables edit and delete", () => {
    const html = renderToStaticMarkup(
      <UserListItem
        id="user-1"
        username="admin"
        fullName="Admin User"
        status="active"
        editDisabled
        deleteDisabled
        actionDisabledReason="Protected ADMIN/SUPER_ADMIN users cannot be edited or deleted from User Management."
      />,
    );

    expect(html).toContain('aria-label="View"');
    expect(html).toContain('aria-label="Edit"');
    expect(html).toContain('aria-label="Delete"');
    expect(html).toContain("Protected ADMIN/SUPER_ADMIN users cannot be edited or deleted from User Management.");
    expect(html.match(/disabled=""/g)?.length).toBe(2);
  });

  it("disables ADMIN appointment edit/delete and blocks handover for non-SUPER_ADMIN actors", () => {
    const html = renderToStaticMarkup(
      <AppointmentTable
        appointments={[baseAppointment]}
        users={[]}
        loading={false}
        actorIsSuperAdmin={false}
        onHandover={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(html).toContain("Only SUPER_ADMIN can hand over ADMIN appointment.");
    expect(html).toContain("Protected ADMIN/SUPER_ADMIN appointments cannot be edited.");
    expect(html).toContain("Protected ADMIN/SUPER_ADMIN appointments cannot be deleted.");
    expect(html.match(/disabled=""/g)?.length).toBe(3);
  }, FULL_SUITE_RENDER_TIMEOUT_MS);

  it("allows SUPER_ADMIN actors to hand over ADMIN appointments but not edit or delete them", () => {
    const html = renderToStaticMarkup(
      <AppointmentTable
        appointments={[baseAppointment]}
        users={[]}
        loading={false}
        actorIsSuperAdmin
        onHandover={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(html).toContain('title="Handing Over"');
    expect(html).toContain("Protected ADMIN/SUPER_ADMIN appointments cannot be edited.");
    expect(html).toContain("Protected ADMIN/SUPER_ADMIN appointments cannot be deleted.");
    expect(html.match(/disabled=""/g)?.length).toBe(2);
  });

  it("blocks all SUPER_ADMIN appointment management actions", () => {
    const html = renderToStaticMarkup(
      <AppointmentTable
        appointments={[{ ...baseAppointment, positionKey: "SUPER_ADMIN", positionName: "Super Admin" }]}
        users={[]}
        loading={false}
        actorIsSuperAdmin
        onHandover={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(html).toContain("SUPER_ADMIN appointment cannot be handed over.");
    expect(html.match(/disabled=""/g)?.length).toBe(3);
  });
});
