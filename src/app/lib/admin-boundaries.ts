import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { ApiError } from "@/app/lib/http";
import { db } from "@/app/db/client";
import { appointments } from "@/app/db/schema/auth/appointments";
import { positions } from "@/app/db/schema/auth/positions";
import { users } from "@/app/db/schema/auth/users";
import { deriveSidebarRoleGroup } from "@/lib/sidebar-visibility";

const PROTECTED_POSITION_KEYS = ["ADMIN", "SUPER_ADMIN"] as const;
type ProtectedPositionKey = (typeof PROTECTED_POSITION_KEYS)[number];

type AdminActorLike = {
  userId: string;
  roles?: string[] | null;
  claims?: {
    apt?: {
      position?: string | null;
    } | null;
  } | null;
};

export function isSuperAdminActor(actor: AdminActorLike): boolean {
  return (
    deriveSidebarRoleGroup({
      roles: actor.roles ?? [],
      position: actor.claims?.apt?.position ?? null,
    }) === "SUPER_ADMIN"
  );
}

function normalizePositionKey(positionKey: string | null | undefined) {
  return String(positionKey ?? "").trim().toUpperCase();
}

function asProtectedPositionKey(positionKey: string | null | undefined): ProtectedPositionKey | null {
  const normalized = normalizePositionKey(positionKey);
  return PROTECTED_POSITION_KEYS.includes(normalized as ProtectedPositionKey)
    ? (normalized as ProtectedPositionKey)
    : null;
}

export async function isProtectedSystemPositionId(positionId: string): Promise<boolean> {
  const [position] = await db
    .select({ id: positions.id })
    .from(positions)
    .where(and(eq(positions.id, positionId), inArray(positions.key, [...PROTECTED_POSITION_KEYS])))
    .limit(1);

  return Boolean(position);
}

export async function isProtectedSystemPositionKey(positionKey: string): Promise<boolean> {
  return asProtectedPositionKey(positionKey) !== null;
}

export async function assertCanManagePosition(actor: AdminActorLike, positionId: string) {
  if (isSuperAdminActor(actor)) return;

  if (await isProtectedSystemPositionId(positionId)) {
    throw new ApiError(
      403,
      "Only SUPER_ADMIN can manage protected system positions.",
      "protected_position_forbidden"
    );
  }
}

export async function userHasActiveProtectedAppointment(userId: string): Promise<boolean> {
  return Boolean(await getActiveProtectedAppointmentKeyForUser(userId));
}

export async function getActiveProtectedAppointmentKeyForUser(userId: string): Promise<ProtectedPositionKey | null> {
  const [row] = await db
    .select({ positionKey: positions.key })
    .from(appointments)
    .innerJoin(positions, eq(positions.id, appointments.positionId))
    .where(
      and(
        eq(appointments.userId, userId),
        isNull(appointments.deletedAt),
        sql`${appointments.startsAt} <= now()`,
        sql`(${appointments.endsAt} IS NULL OR ${appointments.endsAt} > now())`,
        inArray(positions.key, [...PROTECTED_POSITION_KEYS])
      )
    )
    .limit(1);

  return asProtectedPositionKey(row?.positionKey);
}

export async function userHasAnyActiveProtectedAppointment(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointments)
    .innerJoin(positions, eq(positions.id, appointments.positionId))
    .where(
      and(
        eq(appointments.userId, userId),
        isNull(appointments.deletedAt),
        sql`${appointments.startsAt} <= now()`,
        sql`(${appointments.endsAt} IS NULL OR ${appointments.endsAt} > now())`,
        inArray(positions.key, [...PROTECTED_POSITION_KEYS])
      )
    );

  return Number(row?.count ?? 0) > 0;
}

export async function assertCanEditManagedUser(userId: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new ApiError(404, "User not found", "not_found");
  }

  if (await getActiveProtectedAppointmentKeyForUser(userId)) {
    throw new ApiError(
      403,
      "Protected ADMIN/SUPER_ADMIN users cannot be edited from User Management.",
      "protected_user_forbidden"
    );
  }
}

export async function assertCanDeleteManagedUser(userId: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new ApiError(404, "User not found", "not_found");
  }

  const protectedKey = await getActiveProtectedAppointmentKeyForUser(userId);
  if (protectedKey === "SUPER_ADMIN") {
    throw new ApiError(
      403,
      "SUPER_ADMIN users cannot be deleted.",
      "protected_user_forbidden"
    );
  }

  if (protectedKey === "ADMIN") {
    throw new ApiError(
      403,
      "Protected ADMIN/SUPER_ADMIN users cannot be deleted from User Management.",
      "protected_user_forbidden"
    );
  }
}

export async function assertCanManageUser(actor: AdminActorLike, userId: string) {
  if (isSuperAdminActor(actor)) return;

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new ApiError(404, "User not found", "not_found");
  }

  if (await userHasActiveProtectedAppointment(userId)) {
    throw new ApiError(
      403,
      "Only SUPER_ADMIN can manage users holding protected system appointments.",
      "protected_user_forbidden"
    );
  }
}

export async function assertCanManageAppointmentRecord(actor: AdminActorLike, appointmentId: string) {
  if (isSuperAdminActor(actor)) return;

  const [row] = await db
    .select({
      positionId: appointments.positionId,
      userId: appointments.userId,
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "Appointment not found", "not_found");
  }

  await assertCanManagePosition(actor, row.positionId);
  await assertCanManageUser(actor, row.userId);
}

async function getAppointmentPositionKey(appointmentId: string): Promise<ProtectedPositionKey | string> {
  const [row] = await db
    .select({ positionKey: positions.key })
    .from(appointments)
    .innerJoin(positions, eq(positions.id, appointments.positionId))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "Appointment not found", "not_found");
  }

  return row.positionKey;
}

export async function assertCanEditAppointmentRecord(appointmentId: string) {
  const positionKey = await getAppointmentPositionKey(appointmentId);
  if (asProtectedPositionKey(positionKey)) {
    throw new ApiError(
      403,
      "Protected ADMIN/SUPER_ADMIN appointments cannot be edited from Appointment Management.",
      "protected_appointment_forbidden"
    );
  }
}

export async function assertCanDeleteAppointmentRecord(appointmentId: string) {
  const positionKey = await getAppointmentPositionKey(appointmentId);
  if (asProtectedPositionKey(positionKey)) {
    throw new ApiError(
      403,
      "Protected ADMIN/SUPER_ADMIN appointments cannot be deleted from Appointment Management.",
      "protected_appointment_forbidden"
    );
  }
}

export async function assertCanTransferAppointmentRecord(actor: AdminActorLike, appointmentId: string) {
  const positionKey = await getAppointmentPositionKey(appointmentId);
  const protectedKey = asProtectedPositionKey(positionKey);

  if (protectedKey === "SUPER_ADMIN") {
    throw new ApiError(
      403,
      "SUPER_ADMIN appointment cannot be handed over.",
      "protected_appointment_forbidden"
    );
  }

  if (protectedKey === "ADMIN") {
    if (!isSuperAdminActor(actor)) {
      throw new ApiError(
        403,
        "Only SUPER_ADMIN can hand over ADMIN appointment.",
        "protected_appointment_forbidden"
      );
    }
    return;
  }

  await assertCanManageAppointmentRecord(actor, appointmentId);
}

export async function assertCanAssignAppointment(actor: AdminActorLike, args: {
  positionId: string;
  userId: string;
}) {
  if (isSuperAdminActor(actor)) return;
  await assertCanManagePosition(actor, args.positionId);
  await assertCanManageUser(actor, args.userId);
}

export function isProtectedSystemPositionKeyValue(positionKey: string | null | undefined) {
  return asProtectedPositionKey(positionKey) !== null;
}

async function getPositionKeyById(positionId: string) {
  const [position] = await db
    .select({ key: positions.key })
    .from(positions)
    .where(eq(positions.id, positionId))
    .limit(1);

  if (!position) {
    throw new ApiError(404, "Position not found", "not_found");
  }

  return position.key;
}

export async function assertCanEditPositionRecord(positionId: string) {
  if (asProtectedPositionKey(await getPositionKeyById(positionId))) {
    throw new ApiError(
      403,
      "Protected ADMIN/SUPER_ADMIN positions cannot be edited.",
      "protected_position_forbidden"
    );
  }
}

export async function assertCanDeletePositionRecord(positionId: string) {
  if (asProtectedPositionKey(await getPositionKeyById(positionId))) {
    throw new ApiError(
      403,
      "Protected ADMIN/SUPER_ADMIN positions cannot be deleted.",
      "protected_position_forbidden"
    );
  }
}
