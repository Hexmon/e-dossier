import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { ApiError } from "@/app/lib/http";
import { db } from "@/app/db/client";
import { appointments } from "@/app/db/schema/auth/appointments";
import { positions } from "@/app/db/schema/auth/positions";
import { users } from "@/app/db/schema/auth/users";
import { deriveSidebarRoleGroup } from "@/lib/sidebar-visibility";

const PROTECTED_POSITION_KEYS = ["ADMIN", "SUPER_ADMIN"] as const;

type AdminActorLike = {
  userId: string;
  roles?: string[] | null;
  claims?: {
    apt?: {
      position?: string | null;
    } | null;
  } | null;
};

function isSuperAdminActor(actor: AdminActorLike): boolean {
  return (
    deriveSidebarRoleGroup({
      roles: actor.roles ?? [],
      position: actor.claims?.apt?.position ?? null,
    }) === "SUPER_ADMIN"
  );
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
  const normalized = String(positionKey ?? "").trim().toUpperCase();
  return PROTECTED_POSITION_KEYS.includes(normalized as (typeof PROTECTED_POSITION_KEYS)[number]);
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

export async function assertCanAssignAppointment(actor: AdminActorLike, args: {
  positionId: string;
  userId: string;
}) {
  if (isSuperAdminActor(actor)) return;
  await assertCanManagePosition(actor, args.positionId);
  await assertCanManageUser(actor, args.userId);
}

export function isProtectedSystemPositionKeyValue(positionKey: string | null | undefined) {
  const normalized = String(positionKey ?? "").trim().toUpperCase();
  return PROTECTED_POSITION_KEYS.includes(normalized as (typeof PROTECTED_POSITION_KEYS)[number]);
}
