import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/app/db/client";
import { appointments } from "@/app/db/schema/auth/appointments";
import { delegations } from "@/app/db/schema/auth/delegations";
import { positions } from "@/app/db/schema/auth/positions";
import { platoons } from "@/app/db/schema/auth/platoons";
import { users } from "@/app/db/schema/auth/users";
import { ApiError } from "@/app/lib/http";
import {
  resolveCommanderEquivalentMapping,
} from "@/app/db/queries/functional-role-mappings";
import { COMMANDER_EQUIVALENT_CAPABILITY } from "@/lib/functional-role-capabilities";

export type AuthorityKind = "APPOINTMENT" | "DELEGATION";

export type EffectiveAuthorityContext = {
  authorityKind: AuthorityKind;
  authorityId: string;
  appointmentId: string;
  delegationId: string | null;
  userId: string;
  username: string;
  positionId: string;
  positionKey: string;
  positionName: string | null;
  defaultScope: string;
  scopeType: string;
  scopeId: string | null;
  platoonKey: string | null;
  platoonName: string | null;
  startsAt: Date;
  endsAt: Date | null;
  grantorUserId: string | null;
  grantorUsername: string | null;
  grantorAppointmentId: string | null;
};

export type SwitchableIdentity = {
  kind: AuthorityKind;
  id: string;
  label: string;
  userId: string;
  username: string;
  positionKey: string;
  positionName: string | null;
  scopeType: string;
  scopeId: string | null;
  platoonName: string | null;
  grantorLabel: string | null;
  appointmentId: string | null;
  delegationId: string | null;
};

function buildAuthorityLabel(args: {
  positionName: string | null;
  positionKey: string;
  platoonName: string | null;
  kind: AuthorityKind;
  grantorUsername?: string | null;
}) {
  const base = args.positionName ?? args.positionKey;
  const scope = args.platoonName ? `${base} • ${args.platoonName}` : base;
  if (args.kind === "DELEGATION") {
    return args.grantorUsername ? `${scope} • Acting for ${args.grantorUsername}` : `${scope} • Delegated`;
  }
  return scope;
}

export async function getActiveAppointmentAuthority(appointmentId: string) {
  const [row] = await db
    .select({
      authorityKind: sql<AuthorityKind>`'APPOINTMENT'`,
      authorityId: appointments.id,
      appointmentId: appointments.id,
      delegationId: sql<string | null>`null`,
      userId: users.id,
      username: users.username,
      positionId: positions.id,
      positionKey: positions.key,
      positionName: positions.displayName,
      defaultScope: positions.defaultScope,
      scopeType: appointments.scopeType,
      scopeId: appointments.scopeId,
      platoonKey: platoons.key,
      platoonName: platoons.name,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      grantorUserId: sql<string | null>`null`,
      grantorUsername: sql<string | null>`null`,
      grantorAppointmentId: sql<string | null>`null`,
    })
    .from(appointments)
    .innerJoin(users, eq(users.id, appointments.userId))
    .innerJoin(positions, eq(positions.id, appointments.positionId))
    .leftJoin(platoons, eq(platoons.id, appointments.scopeId))
    .where(
      and(
        eq(appointments.id, appointmentId),
        isNull(appointments.deletedAt),
        lte(appointments.startsAt, new Date()),
        or(isNull(appointments.endsAt), gte(appointments.endsAt, new Date()))
      )
    )
    .limit(1);

  return row ?? null;
}

export async function getActiveDelegationAuthority(delegationId: string) {
  const grantorUsers = alias(users, "grantor_users");
  const granteeUsers = alias(users, "grantee_users");

  const [row] = await db
    .select({
      authorityKind: sql<AuthorityKind>`'DELEGATION'`,
      authorityId: delegations.id,
      appointmentId: appointments.id,
      delegationId: delegations.id,
      userId: granteeUsers.id,
      username: granteeUsers.username,
      positionId: positions.id,
      positionKey: positions.key,
      positionName: positions.displayName,
      defaultScope: positions.defaultScope,
      scopeType: appointments.scopeType,
      scopeId: appointments.scopeId,
      platoonKey: platoons.key,
      platoonName: platoons.name,
      startsAt: delegations.startsAt,
      endsAt: delegations.endsAt,
      grantorUserId: grantorUsers.id,
      grantorUsername: grantorUsers.username,
      grantorAppointmentId: delegations.grantorAppointmentId,
    })
    .from(delegations)
    .innerJoin(appointments, eq(appointments.id, delegations.grantorAppointmentId))
    .innerJoin(positions, eq(positions.id, appointments.positionId))
    .innerJoin(granteeUsers, eq(granteeUsers.id, delegations.granteeUserId))
    .innerJoin(grantorUsers, eq(grantorUsers.id, delegations.grantorUserId))
    .leftJoin(platoons, eq(platoons.id, appointments.scopeId))
    .where(
      and(
        eq(delegations.id, delegationId),
        isNull(delegations.deletedAt),
        isNull(delegations.terminatedAt),
        isNull(appointments.deletedAt),
        lte(delegations.startsAt, new Date()),
        or(isNull(delegations.endsAt), gte(delegations.endsAt, new Date())),
        lte(appointments.startsAt, new Date()),
        or(isNull(appointments.endsAt), gte(appointments.endsAt, new Date()))
      )
    )
    .limit(1);

  return row ?? null;
}

export async function getAuthorityForLogin(args: { appointmentId?: string | null; delegationId?: string | null }) {
  if (args.appointmentId && args.delegationId) {
    throw new ApiError(400, "Provide either appointmentId or delegationId, not both.", "invalid_identity");
  }

  if (args.delegationId) {
    const delegation = await getActiveDelegationAuthority(args.delegationId);
    if (!delegation) {
      throw new ApiError(400, "Delegation is not active", "INVALID_DELEGATION");
    }
    return delegation;
  }

  if (!args.appointmentId) {
    throw new ApiError(400, "appointmentId or delegationId is required", "missing_identity");
  }

  const appointment = await getActiveAppointmentAuthority(args.appointmentId);
  if (!appointment) {
    throw new ApiError(400, "Appointment is not active", "INVALID_APPOINTMENT");
  }
  return appointment;
}

export async function buildAuthorityRoleKeys(authority: Pick<EffectiveAuthorityContext, "positionId" | "positionKey">) {
  const roles = new Set<string>([authority.positionKey]);
  const mapping = await resolveCommanderEquivalentMapping();
  if (mapping?.positionId && mapping.positionId === authority.positionId) {
    roles.add(COMMANDER_EQUIVALENT_CAPABILITY);
  }
  return Array.from(roles);
}

export async function listSwitchableIdentities(userId: string): Promise<SwitchableIdentity[]> {
  const grantorUsers = alias(users, "switch_grantor_users");

  const [appointmentRows, delegationRows] = await Promise.all([
    db
      .select({
        kind: sql<AuthorityKind>`'APPOINTMENT'`,
        id: appointments.id,
        userId: users.id,
        username: users.username,
        positionKey: positions.key,
        positionName: positions.displayName,
        scopeType: appointments.scopeType,
        scopeId: appointments.scopeId,
        platoonName: platoons.name,
        grantorLabel: sql<string | null>`null`,
        appointmentId: appointments.id,
        delegationId: sql<string | null>`null`,
      })
      .from(appointments)
      .innerJoin(users, eq(users.id, appointments.userId))
      .innerJoin(positions, eq(positions.id, appointments.positionId))
      .leftJoin(platoons, eq(platoons.id, appointments.scopeId))
      .where(
        and(
          eq(appointments.userId, userId),
          isNull(appointments.deletedAt),
          lte(appointments.startsAt, new Date()),
          or(isNull(appointments.endsAt), gte(appointments.endsAt, new Date()))
        )
      )
      .orderBy(desc(appointments.startsAt)),
    db
      .select({
        kind: sql<AuthorityKind>`'DELEGATION'`,
        id: delegations.id,
        userId: users.id,
        username: users.username,
        positionKey: positions.key,
        positionName: positions.displayName,
        scopeType: appointments.scopeType,
        scopeId: appointments.scopeId,
        platoonName: platoons.name,
        grantorLabel: grantorUsers.username,
        appointmentId: delegations.grantorAppointmentId,
        delegationId: delegations.id,
      })
      .from(delegations)
      .innerJoin(users, eq(users.id, delegations.granteeUserId))
      .innerJoin(appointments, eq(appointments.id, delegations.grantorAppointmentId))
      .innerJoin(positions, eq(positions.id, appointments.positionId))
      .innerJoin(grantorUsers, eq(grantorUsers.id, delegations.grantorUserId))
      .leftJoin(platoons, eq(platoons.id, appointments.scopeId))
      .where(
        and(
          eq(delegations.granteeUserId, userId),
          isNull(delegations.deletedAt),
          isNull(delegations.terminatedAt),
          lte(delegations.startsAt, new Date()),
          or(isNull(delegations.endsAt), gte(delegations.endsAt, new Date())),
          isNull(appointments.deletedAt),
          lte(appointments.startsAt, new Date()),
          or(isNull(appointments.endsAt), gte(appointments.endsAt, new Date()))
        )
      )
      .orderBy(desc(delegations.startsAt)),
  ]);

  return [...appointmentRows, ...delegationRows].map((identity) => ({
    ...identity,
    label: buildAuthorityLabel({
      positionName: identity.positionName,
      positionKey: identity.positionKey,
      platoonName: identity.platoonName,
      kind: identity.kind,
      grantorUsername: identity.grantorLabel,
    }),
  }));
}
