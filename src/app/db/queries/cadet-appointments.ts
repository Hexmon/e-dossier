import { alias } from "drizzle-orm/pg-core";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  isNull,
  lte,
  ne,
  sql,
} from "drizzle-orm";

import { db } from "@/app/db/client";
import { platoons } from "@/app/db/schema/auth/platoons";
import { users } from "@/app/db/schema/auth/users";
import { cadetAppointments } from "@/app/db/schema/training/cadetAppointments";
import { courses } from "@/app/db/schema/training/courses";
import { ocCadets } from "@/app/db/schema/training/oc";
import { ApiError } from "@/app/lib/http";

type TxLike = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PlatoonScopedCadet = {
  id: string;
  name: string;
  ocNo: string;
  status: string;
};

export type CadetAppointmentRecord = {
  id: string;
  cadetId: string;
  cadetName: string;
  cadetOcNo: string;
  platoonId: string;
  platoonName: string;
  appointmentName: string;
  startsAt: Date;
  endsAt: Date | null;
  reason: string | null;
  appointedByName: string | null;
  endedByName: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DashboardCadetAppointmentRow = {
  appointmentId: string;
  positionName: string;
  officerName: string;
  ocNo: string | null;
  courseName: string | null;
  startsAt: Date;
};

export type CadetAppointmentsDashboard = {
  platoon: {
    id: string;
    key: string;
    name: string;
  };
  cadets: PlatoonScopedCadet[];
  activeAppointments: CadetAppointmentRecord[];
  historyAppointments: CadetAppointmentRecord[];
};

function normalizeAppointmentName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

async function assertCadetInPlatoon(
  tx: TxLike,
  cadetId: string,
  platoonId: string
): Promise<void> {
  const [cadet] = await tx
    .select({ id: ocCadets.id })
    .from(ocCadets)
    .where(
      and(
        eq(ocCadets.id, cadetId),
        eq(ocCadets.platoonId, platoonId),
        eq(ocCadets.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!cadet) {
    throw new ApiError(400, "Selected cadet is not active in your platoon.", "bad_request");
  }
}

async function assertOverlappingAppointmentAbsent(
  tx: TxLike,
  params: {
    platoonId: string;
    appointmentName: string;
    startsAt: Date;
    endsAt?: Date | null;
    excludeId?: string;
  }
): Promise<void> {
  const normalizedName = normalizeAppointmentName(params.appointmentName);
  const predicates = [
    eq(cadetAppointments.platoonId, params.platoonId),
    sql`lower(${cadetAppointments.appointmentName}) = lower(${normalizedName})`,
    isNull(cadetAppointments.deletedAt),
    sql`${cadetAppointments.startsAt} <= COALESCE(${params.endsAt ?? null}, 'infinity'::timestamptz)`,
    sql`(${cadetAppointments.endsAt} IS NULL OR ${cadetAppointments.endsAt} >= ${params.startsAt})`,
  ];

  if (params.excludeId) {
    predicates.push(ne(cadetAppointments.id, params.excludeId));
  }

  const [existing] = await tx
    .select({ id: cadetAppointments.id })
    .from(cadetAppointments)
    .where(and(...predicates))
    .limit(1);

  if (existing) {
    throw new ApiError(
      409,
      "Another overlapping cadet appointment already exists for this platoon appointment.",
      "conflict"
    );
  }
}

async function selectAppointmentById(tx: TxLike, appointmentId: string, platoonId: string) {
  const [row] = await tx
    .select()
    .from(cadetAppointments)
    .where(
      and(eq(cadetAppointments.id, appointmentId), eq(cadetAppointments.platoonId, platoonId))
    )
    .limit(1);

  if (!row) {
    throw new ApiError(404, "Cadet appointment not found.", "not_found");
  }

  return row;
}

async function listCadetAppointments(
  platoonId: string,
  kind: "active" | "history"
): Promise<CadetAppointmentRecord[]> {
  const appointedByUser = alias(users, "appointed_by_user");
  const endedByUser = alias(users, "ended_by_user");
  const now = new Date();

  const predicates = [
    eq(cadetAppointments.platoonId, platoonId),
    isNull(cadetAppointments.deletedAt),
  ];

  if (kind === "active") {
    predicates.push(lte(cadetAppointments.startsAt, now));
    predicates.push(
      sql`(${cadetAppointments.endsAt} IS NULL OR ${cadetAppointments.endsAt} >= ${now})`
    );
  } else {
    predicates.push(sql`${cadetAppointments.endsAt} IS NOT NULL`);
    predicates.push(lte(cadetAppointments.endsAt, now));
  }

  return db
    .select({
      id: cadetAppointments.id,
      cadetId: cadetAppointments.cadetId,
      cadetName: ocCadets.name,
      cadetOcNo: ocCadets.ocNo,
      platoonId: cadetAppointments.platoonId,
      platoonName: platoons.name,
      appointmentName: cadetAppointments.appointmentName,
      startsAt: cadetAppointments.startsAt,
      endsAt: cadetAppointments.endsAt,
      reason: cadetAppointments.reason,
      appointedByName: appointedByUser.name,
      endedByName: endedByUser.name,
      deletedAt: cadetAppointments.deletedAt,
      createdAt: cadetAppointments.createdAt,
      updatedAt: cadetAppointments.updatedAt,
    })
    .from(cadetAppointments)
    .innerJoin(ocCadets, eq(ocCadets.id, cadetAppointments.cadetId))
    .innerJoin(platoons, eq(platoons.id, cadetAppointments.platoonId))
    .leftJoin(appointedByUser, eq(appointedByUser.id, cadetAppointments.appointedBy))
    .leftJoin(endedByUser, eq(endedByUser.id, cadetAppointments.endedBy))
    .where(and(...predicates))
    .orderBy(
      kind === "active" ? asc(cadetAppointments.appointmentName) : desc(cadetAppointments.endsAt)
    );
}

export async function getCadetAppointmentsDashboard(
  platoonId: string
): Promise<CadetAppointmentsDashboard> {
  const [platoon, cadets, activeAppointments, historyAppointments] = await Promise.all([
    db
      .select({
        id: platoons.id,
        key: platoons.key,
        name: platoons.name,
      })
      .from(platoons)
      .where(and(eq(platoons.id, platoonId), isNull(platoons.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: ocCadets.id,
        name: ocCadets.name,
        ocNo: ocCadets.ocNo,
        status: ocCadets.status,
      })
      .from(ocCadets)
      .where(and(eq(ocCadets.platoonId, platoonId), eq(ocCadets.status, "ACTIVE")))
      .orderBy(asc(ocCadets.name)),
    listCadetAppointments(platoonId, "active"),
    listCadetAppointments(platoonId, "history"),
  ]);

  if (!platoon) {
    throw new ApiError(404, "Platoon not found.", "not_found");
  }

  return {
    platoon,
    cadets,
    activeAppointments,
    historyAppointments,
  };
}

export async function createCadetAppointment(params: {
  platoonId: string;
  cadetId: string;
  appointmentName: string;
  startsAt: Date;
  reason?: string | null;
  actorUserId: string;
}): Promise<CadetAppointmentRecord> {
  const normalizedName = normalizeAppointmentName(params.appointmentName);

  const inserted = await db.transaction(async (tx) => {
    await assertCadetInPlatoon(tx, params.cadetId, params.platoonId);
    await assertOverlappingAppointmentAbsent(tx, {
      platoonId: params.platoonId,
      appointmentName: normalizedName,
      startsAt: params.startsAt,
      endsAt: null,
    });

    const [row] = await tx
      .insert(cadetAppointments)
      .values({
        cadetId: params.cadetId,
        platoonId: params.platoonId,
        appointmentName: normalizedName,
        startsAt: params.startsAt,
        endsAt: null,
        appointedBy: params.actorUserId,
        reason: params.reason ?? null,
      })
      .returning({ id: cadetAppointments.id });

    return row;
  });

  const dashboard = await getCadetAppointmentsDashboard(params.platoonId);
  const created = dashboard.activeAppointments.find((item) => item.id === inserted.id);

  if (!created) {
    throw new ApiError(
      500,
      "Failed to load created cadet appointment.",
      "cadet_appointment_create_failed"
    );
  }

  return created;
}

export async function updateCadetAppointment(params: {
  appointmentId: string;
  platoonId: string;
  actorUserId: string;
  cadetId?: string;
  appointmentName?: string;
  startsAt?: Date;
  endsAt?: Date | null;
  reason?: string | null;
}): Promise<{ before: typeof cadetAppointments.$inferSelect; after: CadetAppointmentRecord }> {
  const txResult = await db.transaction(async (tx) => {
    const current = await selectAppointmentById(tx, params.appointmentId, params.platoonId);

    const nextCadetId = params.cadetId ?? current.cadetId;
    const nextAppointmentName = normalizeAppointmentName(
      params.appointmentName ?? current.appointmentName
    );
    const nextStartsAt = params.startsAt ?? current.startsAt;
    const nextEndsAt = params.endsAt !== undefined ? params.endsAt : current.endsAt;

    if (nextEndsAt && nextStartsAt >= nextEndsAt) {
      throw new ApiError(400, "Start date must be earlier than end date.", "bad_request");
    }

    await assertCadetInPlatoon(tx, nextCadetId, params.platoonId);
    await assertOverlappingAppointmentAbsent(tx, {
      platoonId: params.platoonId,
      appointmentName: nextAppointmentName,
      startsAt: nextStartsAt,
      endsAt: nextEndsAt,
      excludeId: current.id,
    });

    await tx
      .update(cadetAppointments)
      .set({
        cadetId: nextCadetId,
        appointmentName: nextAppointmentName,
        startsAt: nextStartsAt,
        endsAt: nextEndsAt,
        reason: params.reason !== undefined ? params.reason : current.reason,
        updatedAt: new Date(),
      })
      .where(eq(cadetAppointments.id, current.id));

    return { before: current, id: current.id };
  });

  const dashboard = await getCadetAppointmentsDashboard(params.platoonId);
  const after =
    dashboard.activeAppointments.find((item) => item.id === txResult.id) ??
    dashboard.historyAppointments.find((item) => item.id === txResult.id);

  if (!after) {
    throw new ApiError(
      500,
      "Failed to load updated cadet appointment.",
      "cadet_appointment_update_failed"
    );
  }

  return {
    before: txResult.before,
    after,
  };
}

export async function deleteCadetAppointment(params: {
  appointmentId: string;
  platoonId: string;
  actorUserId: string;
}) {
  return db.transaction(async (tx) => {
    const current = await selectAppointmentById(tx, params.appointmentId, params.platoonId);

    await tx
      .update(cadetAppointments)
      .set({
        deletedAt: new Date(),
        endedBy: params.actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(cadetAppointments.id, current.id));

    return current;
  });
}

export async function transferCadetAppointment(params: {
  appointmentId: string;
  platoonId: string;
  actorUserId: string;
  newCadetId: string;
  prevEndsAt: Date;
  newStartsAt: Date;
  reason?: string | null;
}): Promise<{
  ended: typeof cadetAppointments.$inferSelect;
  next: CadetAppointmentRecord;
}> {
  const txResult = await db.transaction(async (tx) => {
    const current = await selectAppointmentById(tx, params.appointmentId, params.platoonId);

    if (current.deletedAt) {
      throw new ApiError(404, "Cadet appointment not found.", "not_found");
    }
    if (current.endsAt && current.endsAt <= new Date()) {
      throw new ApiError(409, "Cannot transfer a completed cadet appointment.", "conflict");
    }
    if (params.prevEndsAt <= current.startsAt) {
      throw new ApiError(
        400,
        "Handover must be after the current appointment start date.",
        "bad_request"
      );
    }
    if (params.newStartsAt <= params.prevEndsAt) {
      throw new ApiError(400, "Takeover must be after the handover date.", "bad_request");
    }

    await assertCadetInPlatoon(tx, params.newCadetId, params.platoonId);
    await assertOverlappingAppointmentAbsent(tx, {
      platoonId: params.platoonId,
      appointmentName: current.appointmentName,
      startsAt: params.newStartsAt,
      endsAt: null,
      excludeId: current.id,
    });

    const [ended] = await tx
      .update(cadetAppointments)
      .set({
        endsAt: params.prevEndsAt,
        endedBy: params.actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(cadetAppointments.id, current.id))
      .returning();

    const [next] = await tx
      .insert(cadetAppointments)
      .values({
        cadetId: params.newCadetId,
        platoonId: current.platoonId,
        appointmentName: current.appointmentName,
        startsAt: params.newStartsAt,
        endsAt: null,
        appointedBy: params.actorUserId,
        reason: params.reason ?? current.reason,
      })
      .returning({ id: cadetAppointments.id });

    return { ended, nextId: next.id };
  });

  const dashboard = await getCadetAppointmentsDashboard(params.platoonId);
  const next = dashboard.activeAppointments.find((item) => item.id === txResult.nextId);

  if (!next) {
    throw new ApiError(
      500,
      "Failed to load transferred cadet appointment.",
      "cadet_appointment_transfer_failed"
    );
  }

  return {
    ended: txResult.ended,
    next,
  };
}

export async function getCadetAppointmentById(params: {
  appointmentId: string;
  platoonId: string;
}): Promise<CadetAppointmentRecord> {
  const dashboard = await getCadetAppointmentsDashboard(params.platoonId);
  const row =
    dashboard.activeAppointments.find((item) => item.id === params.appointmentId) ??
    dashboard.historyAppointments.find((item) => item.id === params.appointmentId);

  if (!row) {
    throw new ApiError(404, "Cadet appointment not found.", "not_found");
  }

  return row;
}

export async function listActiveCadetAppointmentsForDashboard(
  platoonId: string
): Promise<DashboardCadetAppointmentRow[]> {
  const now = new Date();

  return db
    .select({
      appointmentId: cadetAppointments.id,
      positionName: cadetAppointments.appointmentName,
      officerName: sql<string>`TRIM(CONCAT(${ocCadets.ocNo}, ' ', ${ocCadets.name}))`,
      ocNo: ocCadets.ocNo,
      courseName: courses.title,
      startsAt: cadetAppointments.startsAt,
    })
    .from(cadetAppointments)
    .innerJoin(ocCadets, eq(ocCadets.id, cadetAppointments.cadetId))
    .innerJoin(courses, eq(courses.id, ocCadets.courseId))
    .where(
      and(
        eq(cadetAppointments.platoonId, platoonId),
        isNull(cadetAppointments.deletedAt),
        lte(cadetAppointments.startsAt, now),
        sql`(${cadetAppointments.endsAt} IS NULL OR ${cadetAppointments.endsAt} >= ${now})`
      )
    )
    .orderBy(desc(cadetAppointments.startsAt), asc(ocCadets.name));
}

export async function searchCadetAppointmentsByName(params: {
  platoonId: string;
  search: string;
}) {
  const query = params.search.trim();
  if (!query) return [];

  return db
    .select({
      id: cadetAppointments.id,
      appointmentName: cadetAppointments.appointmentName,
    })
    .from(cadetAppointments)
    .where(
      and(
        eq(cadetAppointments.platoonId, params.platoonId),
        isNull(cadetAppointments.deletedAt),
        ilike(cadetAppointments.appointmentName, `%${query}%`)
      )
    )
    .orderBy(asc(cadetAppointments.appointmentName))
    .limit(20);
}
