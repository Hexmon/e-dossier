import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";

import { db } from "@/app/db/client";
import { appointments } from "@/app/db/schema/auth/appointments";
import { platoons } from "@/app/db/schema/auth/platoons";
import { positions } from "@/app/db/schema/auth/positions";
import { users } from "@/app/db/schema/auth/users";
import { ApiError } from "@/app/lib/http";
import { resolveCommanderEquivalentMapping } from "@/app/db/queries/functional-role-mappings";

export type PlatoonCommanderHistoryPlatoon = {
  id: string;
  key: string;
  name: string;
  about: string | null;
  themeColor: string;
  imageUrl: string | null;
};

export type PlatoonCommanderHistoryItem = {
  appointmentId: string;
  userId: string;
  username: string;
  name: string;
  rank: string;
  assignment: "PRIMARY" | "OFFICIATING";
  startsAt: Date;
  endsAt: Date | null;
  status: "CURRENT" | "PREVIOUS";
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function whereForIdKeyName(idOrKey: string) {
  if (isUuid(idOrKey)) {
    return and(eq(platoons.id, idOrKey), isNull(platoons.deletedAt));
  }

  const up = idOrKey.toUpperCase();
  const lc = idOrKey.toLowerCase();
  return and(
    isNull(platoons.deletedAt),
    or(eq(platoons.key, up), sql`lower(${platoons.name}) = ${lc}`),
  );
}

export async function getPublicPlatoonByIdOrKey(
  idOrKey: string,
): Promise<PlatoonCommanderHistoryPlatoon | null> {
  const [platoon] = await db
    .select({
      id: platoons.id,
      key: platoons.key,
      name: platoons.name,
      about: platoons.about,
      themeColor: platoons.themeColor,
      imageUrl: platoons.imageUrl,
    })
    .from(platoons)
    .where(whereForIdKeyName(idOrKey))
    .limit(1);

  return platoon ?? null;
}

export async function getPlatoonCommanderHistoryByIdOrKey(idOrKey: string): Promise<{
  platoon: PlatoonCommanderHistoryPlatoon;
  items: PlatoonCommanderHistoryItem[];
}> {
  const platoon = await getPublicPlatoonByIdOrKey(idOrKey);
  if (!platoon) {
    throw new ApiError(404, "Platoon not found.", "not_found");
  }

  const now = new Date();
  const mapping = await resolveCommanderEquivalentMapping();

  if (!mapping?.positionId) {
    return { platoon, items: [] };
  }

  const rows = await db
    .select({
      appointmentId: appointments.id,
      userId: users.id,
      username: users.username,
      name: users.name,
      rank: users.rank,
      assignment: appointments.assignment,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
    })
    .from(appointments)
    .innerJoin(positions, eq(positions.id, appointments.positionId))
    .innerJoin(users, eq(users.id, appointments.userId))
    .where(
      and(
        eq(appointments.positionId, mapping.positionId),
        eq(appointments.scopeType, "PLATOON"),
        eq(appointments.scopeId, platoon.id),
        isNull(appointments.deletedAt),
        lte(appointments.startsAt, now),
      ),
    )
    .orderBy(asc(appointments.startsAt));

  const items = rows
    .map((row) => ({
      ...row,
      status: (!row.endsAt || new Date(row.endsAt) > now ? "CURRENT" : "PREVIOUS") as
        | "CURRENT"
        | "PREVIOUS",
    }))
    .sort((a, b) => {
      if (a.status === "CURRENT" && b.status !== "CURRENT") return -1;
      if (a.status !== "CURRENT" && b.status === "CURRENT") return 1;
      return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
    });

  return { platoon, items };
}
