import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import {
  marksWorkflowEvents,
  marksWorkflowModuleEnum,
  marksWorkflowNotifications,
  marksWorkflowSettings,
  marksWorkflowTickets,
} from '@/app/db/schema/training/marksReviewWorkflow';
import type { MarksWorkflowModule } from '@/app/lib/marks-review-workflow';

type DbLike = typeof db | any;

function getExecutor(tx?: DbLike): DbLike {
  return tx ?? db;
}

export async function listWorkflowSettingsRows(tx?: DbLike) {
  return getExecutor(tx).select().from(marksWorkflowSettings).orderBy(marksWorkflowSettings.module);
}

export async function getWorkflowSettingsRow(module: MarksWorkflowModule, tx?: DbLike) {
  const [row] = await getExecutor(tx)
    .select()
    .from(marksWorkflowSettings)
    .where(eq(marksWorkflowSettings.module, module))
    .limit(1);
  return row ?? null;
}

export async function upsertWorkflowSettingsRow(
  module: MarksWorkflowModule,
  data: {
    dataEntryUserIds: string[];
    verificationUserIds: string[];
    postVerificationOverrideMode: 'SUPER_ADMIN_ONLY' | 'ADMIN_AND_SUPER_ADMIN';
  },
  updatedBy: string,
  tx?: DbLike,
) {
  const now = new Date();
  const [row] = await getExecutor(tx)
    .insert(marksWorkflowSettings)
    .values({
      module,
      dataEntryUserIds: data.dataEntryUserIds,
      verificationUserIds: data.verificationUserIds,
      postVerificationOverrideMode: data.postVerificationOverrideMode,
      updatedBy,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: marksWorkflowSettings.module,
      set: {
        dataEntryUserIds: data.dataEntryUserIds,
        verificationUserIds: data.verificationUserIds,
        postVerificationOverrideMode: data.postVerificationOverrideMode,
        updatedBy,
        updatedAt: now,
      },
    })
    .returning();
  return row;
}

export async function getWorkflowTicketRow(module: MarksWorkflowModule, workflowKey: string, tx?: DbLike) {
  const [row] = await getExecutor(tx)
    .select()
    .from(marksWorkflowTickets)
    .where(and(eq(marksWorkflowTickets.module, module), eq(marksWorkflowTickets.workflowKey, workflowKey)))
    .limit(1);
  return row ?? null;
}

export async function createWorkflowTicketRow(
  data: typeof marksWorkflowTickets.$inferInsert,
  tx?: DbLike,
) {
  const [row] = await getExecutor(tx)
    .insert(marksWorkflowTickets)
    .values(data)
    .returning();
  return row;
}

export async function updateWorkflowTicketRow(
  ticketId: string,
  data: Partial<typeof marksWorkflowTickets.$inferInsert>,
  tx?: DbLike,
) {
  const [row] = await getExecutor(tx)
    .update(marksWorkflowTickets)
    .set(data)
    .where(eq(marksWorkflowTickets.id, ticketId))
    .returning();
  return row ?? null;
}

export async function listWorkflowEventsByTicketId(ticketId: string, tx?: DbLike) {
  return getExecutor(tx)
    .select()
    .from(marksWorkflowEvents)
    .where(eq(marksWorkflowEvents.ticketId, ticketId))
    .orderBy(asc(marksWorkflowEvents.createdAt));
}

export async function createWorkflowEventRow(
  data: typeof marksWorkflowEvents.$inferInsert,
  tx?: DbLike,
) {
  const [row] = await getExecutor(tx)
    .insert(marksWorkflowEvents)
    .values(data)
    .returning();
  return row;
}

export async function createWorkflowNotificationsRows(
  rows: Array<typeof marksWorkflowNotifications.$inferInsert>,
  tx?: DbLike,
) {
  if (!rows.length) return [];
  return getExecutor(tx)
    .insert(marksWorkflowNotifications)
    .values(rows)
    .returning();
}

export async function listWorkflowNotificationsForUser(userId: string, tx?: DbLike) {
  return getExecutor(tx)
    .select()
    .from(marksWorkflowNotifications)
    .where(eq(marksWorkflowNotifications.userId, userId))
    .orderBy(desc(isNull(marksWorkflowNotifications.readAt)), desc(marksWorkflowNotifications.createdAt));
}

export async function markWorkflowNotificationRead(userId: string, notificationId: string, tx?: DbLike) {
  const now = new Date();
  const [row] = await getExecutor(tx)
    .update(marksWorkflowNotifications)
    .set({ readAt: now, updatedAt: now })
    .where(
      and(
        eq(marksWorkflowNotifications.id, notificationId),
        eq(marksWorkflowNotifications.userId, userId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function markAllWorkflowNotificationsRead(userId: string, tx?: DbLike) {
  const now = new Date();
  return getExecutor(tx)
    .update(marksWorkflowNotifications)
    .set({ readAt: now, updatedAt: now })
    .where(and(eq(marksWorkflowNotifications.userId, userId), isNull(marksWorkflowNotifications.readAt)))
    .returning();
}

export async function listActiveUsersByIds(ids: string[], tx?: DbLike) {
  if (!ids.length) return [];
  return getExecutor(tx)
    .select({
      id: users.id,
      name: users.name,
      rank: users.rank,
      username: users.username,
      isActive: users.isActive,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(inArray(users.id, ids));
}

export async function listWorkflowActorUsersByIds(ids: string[], tx?: DbLike) {
  if (!ids.length) return [];
  return getExecutor(tx)
    .select({
      id: users.id,
      name: users.name,
      rank: users.rank,
      username: users.username,
    })
    .from(users)
    .where(and(inArray(users.id, ids), isNull(users.deletedAt)));
}
