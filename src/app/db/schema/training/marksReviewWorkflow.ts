import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '@/app/db/schema/auth/users';

export const marksWorkflowModuleEnum = pgEnum('marks_workflow_module', [
  'ACADEMICS_BULK',
  'PT_BULK',
]);

export const marksWorkflowStatusEnum = pgEnum('marks_workflow_status', [
  'DRAFT',
  'PENDING_VERIFICATION',
  'CHANGES_REQUESTED',
  'VERIFIED',
]);

export const marksWorkflowEventTypeEnum = pgEnum('marks_workflow_event_type', [
  'SAVE_DRAFT',
  'SUBMIT_FOR_VERIFICATION',
  'REQUEST_CHANGES',
  'VERIFY_AND_PUBLISH',
  'OVERRIDE_PUBLISH',
]);

export const marksWorkflowOverrideModeEnum = pgEnum('marks_workflow_override_mode', [
  'SUPER_ADMIN_ONLY',
  'ADMIN_AND_SUPER_ADMIN',
]);

export const marksWorkflowSettings = pgTable(
  'marks_workflow_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    module: marksWorkflowModuleEnum('module').notNull(),
    dataEntryUserIds: jsonb('data_entry_user_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    verificationUserIds: jsonb('verification_user_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    postVerificationOverrideMode: marksWorkflowOverrideModeEnum('post_verification_override_mode')
      .notNull()
      .default('SUPER_ADMIN_ONLY'),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqModule: uniqueIndex('uq_marks_workflow_settings_module').on(table.module),
  }),
);

export const marksWorkflowTickets = pgTable(
  'marks_workflow_tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    module: marksWorkflowModuleEnum('module').notNull(),
    workflowKey: text('workflow_key').notNull(),
    courseId: uuid('course_id').notNull(),
    semester: integer('semester').notNull(),
    subjectId: uuid('subject_id'),
    subjectLabel: text('subject_label'),
    courseLabel: text('course_label'),
    selectionLabel: text('selection_label'),
    status: marksWorkflowStatusEnum('status').notNull().default('DRAFT'),
    draftPayload: jsonb('draft_payload').$type<Record<string, unknown>>().notNull(),
    currentRevision: integer('current_revision').notNull().default(1),
    submittedByUserId: uuid('submitted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    verifiedByUserId: uuid('verified_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    lastActorUserId: uuid('last_actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    lastActorMessage: text('last_actor_message'),
    draftUpdatedAt: timestamp('draft_updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqModuleWorkflowKey: uniqueIndex('uq_marks_workflow_tickets_module_key').on(table.module, table.workflowKey),
    ixModuleCourseSemester: index('ix_marks_workflow_tickets_module_course_semester').on(
      table.module,
      table.courseId,
      table.semester,
    ),
  }),
);

export const marksWorkflowEvents = pgTable(
  'marks_workflow_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => marksWorkflowTickets.id, { onDelete: 'cascade' }),
    eventType: marksWorkflowEventTypeEnum('event_type').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    fromStatus: marksWorkflowStatusEnum('from_status'),
    toStatus: marksWorkflowStatusEnum('to_status'),
    message: text('message'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ixTicketCreatedAt: index('ix_marks_workflow_events_ticket_created_at').on(table.ticketId, table.createdAt),
  }),
);

export const marksWorkflowNotifications = pgTable(
  'marks_workflow_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => marksWorkflowTickets.id, { onDelete: 'cascade' }),
    module: marksWorkflowModuleEnum('module').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    workflowStatus: marksWorkflowStatusEnum('workflow_status').notNull(),
    selectionLabel: text('selection_label').notNull(),
    message: text('message'),
    deepLink: text('deep_link').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ixUserUnreadCreatedAt: index('ix_marks_workflow_notifications_user_read_created_at').on(
      table.userId,
      table.readAt,
      table.createdAt,
    ),
  }),
);
