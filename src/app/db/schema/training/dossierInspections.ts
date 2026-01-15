import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { ocCadets } from './oc';
import { users } from '../auth/users';

export const dossierInspections = pgTable('dossier_inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
  inspectorUserId: uuid('inspector_user_id').notNull().references(() => users.id, { onDelete: 'set null' }),
  date: timestamp('date', { withTimezone: true }).notNull(),
  remarks: text('remarks'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});
