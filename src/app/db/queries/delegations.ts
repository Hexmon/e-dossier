import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { ApiError } from "@/app/lib/http";
import { db } from "@/app/db/client";
import { appointments } from "@/app/db/schema/auth/appointments";
import { delegations } from "@/app/db/schema/auth/delegations";
import { positions } from "@/app/db/schema/auth/positions";
import { platoons } from "@/app/db/schema/auth/platoons";
import { users } from "@/app/db/schema/auth/users";

type ScopeType = "GLOBAL" | "PLATOON";

const ACTIVE_APPOINTMENT_PREDICATE = and(
  isNull(appointments.deletedAt),
  lte(appointments.startsAt, new Date()),
  or(isNull(appointments.endsAt), gte(appointments.endsAt, new Date()))
);

const ACTIVE_DELEGATION_PREDICATE = and(
  isNull(delegations.deletedAt),
  isNull(delegations.terminatedAt),
  lte(delegations.startsAt, new Date()),
  or(isNull(delegations.endsAt), gte(delegations.endsAt, new Date()))
);

export type DelegationListItem = {
  id: string;
  grantorUserId: string;
  grantorUsername: string;
  grantorAppointmentId: string | null;
  granteeUserId: string;
  granteeUsername: string;
  actAsPositionId: string | null;
  positionKey: string | null;
  positionName: string | null;
  scopeType: ScopeType;
  scopeId: string | null;
  platoonName: string | null;
  startsAt: Date;
  endsAt: Date | null;
  reason: string | null;
  createdBy: string | null;
  terminatedBy: string | null;
  terminatedAt: Date | null;
  terminationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

async function getActiveGrantorAppointment(appointmentId: string) {
  const [appointment] = await db
    .select({
      id: appointments.id,
      userId: appointments.userId,
      positionId: appointments.positionId,
      scopeType: appointments.scopeType,
      scopeId: appointments.scopeId,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
    })
    .from(appointments)
    .where(and(eq(appointments.id, appointmentId), ACTIVE_APPOINTMENT_PREDICATE))
    .limit(1);

  if (!appointment) {
    throw new ApiError(400, "Grantor appointment is not active.", "invalid_grantor_appointment");
  }

  return appointment;
}

async function getActiveGranteeUser(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      isActive: users.isActive,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.deletedAt || !user.isActive) {
    throw new ApiError(400, "Grantee user must be active.", "invalid_grantee");
  }

  return user;
}

async function assertNoOverlappingDelegation(input: {
  positionId: string;
  scopeType: ScopeType;
  scopeId: string | null;
  startsAt: Date;
  endsAt: Date | null;
}) {
  const rows = await db
    .select({ id: delegations.id })
    .from(delegations)
    .where(
      and(
        eq(delegations.actAsPositionId, input.positionId),
        eq(delegations.scopeType, input.scopeType),
        input.scopeId ? eq(delegations.scopeId, input.scopeId) : sql`${delegations.scopeId} IS NULL`,
        isNull(delegations.deletedAt),
        isNull(delegations.terminatedAt),
        sql`${delegations.startsAt} <= COALESCE(${input.endsAt ?? null}, 'infinity'::timestamptz)`,
        sql`(${delegations.endsAt} IS NULL OR ${delegations.endsAt} >= ${input.startsAt})`
      )
    )
    .limit(1);

  if (rows.length > 0) {
    throw new ApiError(
      409,
      "Another active delegation already exists for this position and scope window.",
      "delegation_overlap"
    );
  }
}

export async function createDelegation(params: {
  actorUserId: string;
  grantorAppointmentId: string;
  granteeUserId: string;
  startsAt: Date;
  endsAt?: Date | null;
  reason: string;
}) {
  const grantorAppointment = await getActiveGrantorAppointment(params.grantorAppointmentId);
  const grantee = await getActiveGranteeUser(params.granteeUserId);

  if (grantorAppointment.userId === grantee.id) {
    throw new ApiError(400, "Grantor and grantee must be different users.", "invalid_grantee");
  }

  if (params.endsAt && params.startsAt >= params.endsAt) {
    throw new ApiError(400, "startsAt must be earlier than endsAt.", "invalid_dates");
  }

  if (params.startsAt < new Date(grantorAppointment.startsAt)) {
    throw new ApiError(
      400,
      "Delegation cannot start before the grantor appointment starts.",
      "invalid_dates"
    );
  }

  if (
    grantorAppointment.endsAt &&
    (!params.endsAt || params.endsAt > new Date(grantorAppointment.endsAt))
  ) {
    throw new ApiError(
      400,
      "Delegation must end within the grantor appointment window.",
      "invalid_dates"
    );
  }

  await assertNoOverlappingDelegation({
    positionId: grantorAppointment.positionId,
    scopeType: grantorAppointment.scopeType as ScopeType,
    scopeId: grantorAppointment.scopeId ?? null,
    startsAt: params.startsAt,
    endsAt: params.endsAt ?? null,
  });

  const [created] = await db
    .insert(delegations)
    .values({
      grantorUserId: grantorAppointment.userId,
      grantorAppointmentId: grantorAppointment.id,
      granteeUserId: grantee.id,
      actAsPositionId: grantorAppointment.positionId,
      scopeType: grantorAppointment.scopeType as ScopeType,
      scopeId: grantorAppointment.scopeId ?? null,
      startsAt: params.startsAt,
      endsAt: params.endsAt ?? null,
      reason: params.reason,
      createdBy: params.actorUserId,
    })
    .returning();

  return created;
}

export async function listDelegations(options?: { activeOnly?: boolean }) {
  const grantorUsers = alias(users, "delegation_grantor_users");
  const granteeUsers = alias(users, "delegation_grantee_users");

  return db
    .select({
      id: delegations.id,
      grantorUserId: delegations.grantorUserId,
      grantorUsername: grantorUsers.username,
      grantorAppointmentId: delegations.grantorAppointmentId,
      granteeUserId: delegations.granteeUserId,
      granteeUsername: granteeUsers.username,
      actAsPositionId: delegations.actAsPositionId,
      positionKey: positions.key,
      positionName: positions.displayName,
      scopeType: delegations.scopeType,
      scopeId: delegations.scopeId,
      platoonName: platoons.name,
      startsAt: delegations.startsAt,
      endsAt: delegations.endsAt,
      reason: delegations.reason,
      createdBy: delegations.createdBy,
      terminatedBy: delegations.terminatedBy,
      terminatedAt: delegations.terminatedAt,
      terminationReason: delegations.terminationReason,
      createdAt: delegations.createdAt,
      updatedAt: delegations.updatedAt,
    })
    .from(delegations)
    .innerJoin(grantorUsers, eq(grantorUsers.id, delegations.grantorUserId))
    .innerJoin(granteeUsers, eq(granteeUsers.id, delegations.granteeUserId))
    .leftJoin(positions, eq(positions.id, delegations.actAsPositionId))
    .leftJoin(platoons, eq(platoons.id, delegations.scopeId))
    .where(options?.activeOnly === false ? isNull(delegations.deletedAt) : ACTIVE_DELEGATION_PREDICATE)
    .orderBy(sql`${delegations.startsAt} DESC`);
}

export async function terminateDelegation(params: {
  delegationId: string;
  actorUserId: string;
  reason: string;
}) {
  const [existing] = await db
    .select()
    .from(delegations)
    .where(and(eq(delegations.id, params.delegationId), isNull(delegations.deletedAt)))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, "Delegation not found.", "not_found");
  }
  if (existing.terminatedAt) {
    throw new ApiError(409, "Delegation is already terminated.", "delegation_terminated");
  }

  const [updated] = await db
    .update(delegations)
    .set({
      terminatedAt: new Date(),
      terminatedBy: params.actorUserId,
      terminationReason: params.reason,
      updatedAt: new Date(),
    })
    .where(eq(delegations.id, params.delegationId))
    .returning();

  return { before: existing, after: updated };
}

export async function activeDelegationsFor(userId: string, at: Date = new Date()) {
  return db
    .select()
    .from(delegations)
    .where(
      and(
        eq(delegations.granteeUserId, userId),
        isNull(delegations.deletedAt),
        isNull(delegations.terminatedAt),
        lte(delegations.startsAt, at),
        or(isNull(delegations.endsAt), gte(delegations.endsAt, at))
      )
    );
}

export async function grantDelegation(params: {
  grantorUserId: string;
  granteeUserId: string;
  actAsPosition: string;
  scopeType?: ScopeType;
  scopeId?: string;
  startsAt: Date;
  endsAt?: Date | null;
  reason?: string;
}) {
  const [grantorAppointment] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .innerJoin(positions, eq(positions.id, appointments.positionId))
    .where(
      and(
        eq(appointments.userId, params.grantorUserId),
        eq(positions.key, params.actAsPosition),
        eq(appointments.scopeType, params.scopeType ?? "GLOBAL"),
        params.scopeType === "PLATOON" && params.scopeId
          ? eq(appointments.scopeId, params.scopeId)
          : sql`${appointments.scopeId} IS NULL`,
        ACTIVE_APPOINTMENT_PREDICATE
      )
    )
    .limit(1);

  if (!grantorAppointment) {
    throw new ApiError(400, "No active grantor appointment found for the requested delegation.", "invalid_grantor_appointment");
  }

  return createDelegation({
    actorUserId: params.grantorUserId,
    grantorAppointmentId: grantorAppointment.id,
    granteeUserId: params.granteeUserId,
    startsAt: params.startsAt,
    endsAt: params.endsAt ?? null,
    reason: params.reason ?? "Delegated authority",
  });
}
