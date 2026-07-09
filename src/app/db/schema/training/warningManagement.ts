import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid, boolean } from 'drizzle-orm/pg-core';
import { users } from '@/app/db/schema/auth/users';

export const warningManagementSettings = pgTable(
  'warning_management_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    criterionKey: text('criterion_key').notNull(),
    module: text('module').notNull().default('DISCIPLINE'),
    positionKey: text('position_key').notNull(),
    positionName: text('position_name').notNull(),
    triggerType: text('trigger_type').notNull(),
    restrictionPoints: integer('restriction_points').notNull(),
    absenceDays: integer('absence_days').notNull().default(0),
    isEnabled: boolean('is_enabled').notNull().default(true),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqCriterion: uniqueIndex('uq_warning_management_settings_criterion').on(table.criterionKey),
    ixModule: index('ix_warning_management_settings_module').on(table.module),
    ixPositionKey: index('ix_warning_management_settings_position_key').on(table.positionKey),
  }),
);

export const warningNotificationReads = pgTable(
  'warning_notification_reads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    notificationKey: text('notification_key').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqUserNotification: uniqueIndex('uq_warning_notification_reads_user_key').on(table.userId, table.notificationKey),
    ixUserReadAt: index('ix_warning_notification_reads_user_read_at').on(table.userId, table.readAt),
  }),
);
