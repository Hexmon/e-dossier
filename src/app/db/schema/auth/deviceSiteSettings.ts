import { pgTable, uuid, varchar, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

export const deviceSiteSettings = pgTable(
  "device_site_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: varchar("device_id", { length: 128 }).notNull(),
    themeMode: varchar("theme", { length: 16 }).notNull().default("system"),
    themePreset: varchar("theme_preset", { length: 32 }).notNull().default("navy-steel"),
    accentPalette: varchar("accent_palette", { length: 16 }).notNull().default("blue"),
    language: varchar("language", { length: 16 }).notNull().default("en"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Kolkata"),
    refreshIntervalSec: integer("refresh_interval").notNull().default(60),
    density: varchar("layout_density", { length: 16 }).notNull().default("comfortable"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => ({
    uxDeviceId: uniqueIndex("ux_device_site_settings_device_id").on(table.deviceId),
  })
);
