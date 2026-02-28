import { boolean, index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from '@/app/db/schema/auth/users';

export const reportDownloadVersions = pgTable(
  'report_download_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    versionId: varchar('version_id', { length: 32 }).notNull().unique(),
    reportType: varchar('report_type', { length: 80 }).notNull(),
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
    filters: jsonb('filters').$type<Record<string, unknown>>().notNull(),
    preparedBy: varchar('prepared_by', { length: 160 }).notNull(),
    checkedBy: varchar('checked_by', { length: 160 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    encrypted: boolean('encrypted').notNull().default(true),
    checksumSha256: varchar('checksum_sha256', { length: 64 }),
    batchId: uuid('batch_id'),
  },
  (t) => ({
    idxGeneratedAt: index('idx_report_download_versions_generated_at').on(t.generatedAt),
    idxReportType: index('idx_report_download_versions_report_type').on(t.reportType),
    idxRequestedBy: index('idx_report_download_versions_requested_by').on(t.requestedByUserId),
    idxBatch: index('idx_report_download_versions_batch').on(t.batchId),
  })
);
