import { and, eq, isNull, ne, sql } from "drizzle-orm";

import { appointments } from "@/app/db/schema/auth/appointments";
import { users } from "@/app/db/schema/auth/users";

type AppointmentDb = {
  select: (...args: any[]) => any;
};

type FindOverlappingPrimaryAppointmentInput = {
  db: AppointmentDb;
  positionId: string;
  scopeType: "GLOBAL" | "PLATOON";
  scopeId: string | null;
  startsAt: Date;
  endsAt: Date | null;
  excludeAppointmentId?: string;
};

export type AppointmentOverlap = {
  id: string;
  userId: string;
  username: string;
  startsAt: Date | string;
  endsAt: Date | string | null;
};

export async function findOverlappingPrimaryAppointment({
  db,
  positionId,
  scopeType,
  scopeId,
  startsAt,
  endsAt,
  excludeAppointmentId,
}: FindOverlappingPrimaryAppointmentInput): Promise<AppointmentOverlap | null> {
  const where = [
    eq(appointments.positionId, positionId),
    eq(appointments.scopeType, scopeType),
    scopeType === "PLATOON" && scopeId
      ? eq(appointments.scopeId, scopeId)
      : isNull(appointments.scopeId),
    eq(appointments.assignment, "PRIMARY"),
    isNull(appointments.deletedAt),
    isNull(users.deletedAt),
    sql`${appointments.startsAt} < COALESCE(${endsAt ?? null}, 'infinity'::timestamptz)`,
    sql`(${appointments.endsAt} IS NULL OR ${appointments.endsAt} > ${startsAt})`,
  ];

  if (excludeAppointmentId) {
    where.push(ne(appointments.id, excludeAppointmentId));
  }

  const [overlap] = await db
    .select({
      id: appointments.id,
      userId: appointments.userId,
      username: users.username,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
    })
    .from(appointments)
    .innerJoin(users, eq(users.id, appointments.userId))
    .where(and(...where))
    .limit(1);

  return overlap ?? null;
}

export function appointmentOverlapConflictDetails(input: {
  positionId: string;
  scopeType: "GLOBAL" | "PLATOON";
  scopeId: string | null;
  conflictingAppointment: AppointmentOverlap;
}) {
  return {
    positionId: input.positionId,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    conflictingAppointment: {
      id: input.conflictingAppointment.id,
      userId: input.conflictingAppointment.userId,
      username: input.conflictingAppointment.username,
      startsAt: input.conflictingAppointment.startsAt,
      endsAt: input.conflictingAppointment.endsAt,
    },
  };
}
