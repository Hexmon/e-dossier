import { desc, eq } from "drizzle-orm";
import { db } from "@/app/db/client";
import { users } from "@/app/db/schema/auth/users";
import { interviewPendingTickerSettings } from "@/app/db/schema/auth/interviewPendingTickerSettings";

const BASE_SELECT = {
  id: interviewPendingTickerSettings.id,
  startDate: interviewPendingTickerSettings.startDate,
  endDate: interviewPendingTickerSettings.endDate,
  days: interviewPendingTickerSettings.days,
  createdBy: interviewPendingTickerSettings.createdBy,
  createdAt: interviewPendingTickerSettings.createdAt,
} as const;

const SELECT_WITH_USER = {
  ...BASE_SELECT,
  createdByUsername: users.username,
} as const;

export type InterviewPendingTickerSettingRecord = {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  createdBy: string | null;
  createdByUsername: string | null;
  createdAt: Date;
};

export type CreateInterviewPendingTickerSettingInput = {
  startDate: string;
  endDate: string;
  days: number;
};

export async function getLatestInterviewPendingTickerSetting() {
  const [row] = await db
    .select(SELECT_WITH_USER)
    .from(interviewPendingTickerSettings)
    .leftJoin(users, eq(interviewPendingTickerSettings.createdBy, users.id))
    .orderBy(desc(interviewPendingTickerSettings.createdAt))
    .limit(1);

  return (row ?? null) as InterviewPendingTickerSettingRecord | null;
}

export async function listInterviewPendingTickerSettingLogs({
  limit,
  offset,
}: {
  limit: number;
  offset: number;
}) {
  const rows = await db
    .select(SELECT_WITH_USER)
    .from(interviewPendingTickerSettings)
    .leftJoin(users, eq(interviewPendingTickerSettings.createdBy, users.id))
    .orderBy(desc(interviewPendingTickerSettings.createdAt))
    .limit(limit)
    .offset(offset);

  return rows as InterviewPendingTickerSettingRecord[];
}

export async function createInterviewPendingTickerSetting(
  input: CreateInterviewPendingTickerSettingInput,
  actorUserId: string
) {
  const [row] = await db
    .insert(interviewPendingTickerSettings)
    .values({
      startDate: input.startDate,
      endDate: input.endDate,
      days: input.days,
      createdBy: actorUserId,
      createdAt: new Date(),
    })
    .returning(BASE_SELECT);

  if (!row) return null;

  const [joined] = await db
    .select(SELECT_WITH_USER)
    .from(interviewPendingTickerSettings)
    .leftJoin(users, eq(interviewPendingTickerSettings.createdBy, users.id))
    .where(eq(interviewPendingTickerSettings.id, row.id))
    .limit(1);

  return (joined ?? null) as InterviewPendingTickerSettingRecord | null;
}
