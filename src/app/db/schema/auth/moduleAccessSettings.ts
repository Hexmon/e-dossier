import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const moduleAccessSettings = pgTable(
  "module_access_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    singletonKey: text("singleton_key").notNull().default("default"),
    adminCanAccessDossier: boolean("admin_can_access_dossier").notNull().default(false),
    adminCanAccessBulkUpload: boolean("admin_can_access_bulk_upload").notNull().default(false),
    adminCanAccessReports: boolean("admin_can_access_reports").notNull().default(false),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqSingleton: uniqueIndex("uq_module_access_settings_singleton_key").on(table.singletonKey),
  })
);
