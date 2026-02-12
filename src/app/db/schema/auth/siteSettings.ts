import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const siteSettings = pgTable(
  "site_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    singletonKey: text("singleton_key").notNull().default("default"),
    logoUrl: text("logo_url"),
    logoObjectKey: text("logo_object_key"),
    heroTitle: text("hero_title").notNull().default("MCEME"),
    heroDescription: text("hero_description")
      .notNull()
      .default(
        "Training Excellence for Officer Cadets (OCs) at the Military College of Electronics & Mechanical Engineering"
      ),
    commandersSectionTitle: text("commanders_section_title").notNull().default("Commander's Corner"),
    awardsSectionTitle: text("awards_section_title").notNull().default("Gallantry Awards"),
    historySectionTitle: text("history_section_title").notNull().default("Our History"),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqSingleton: uniqueIndex("uq_site_settings_singleton_key").on(table.singletonKey),
  })
);

export const siteCommanders = pgTable(
  "site_commanders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    imageObjectKey: text("image_object_key"),
    tenure: text("tenure").notNull(),
    description: text("description").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ixActiveSort: index("ix_site_commanders_active_sort").on(table.isDeleted, table.sortOrder),
  })
);

export const siteAwards = pgTable(
  "site_awards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    imageUrl: text("image_url"),
    imageObjectKey: text("image_object_key"),
    category: text("category").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ixActiveSort: index("ix_site_awards_active_sort").on(table.isDeleted, table.sortOrder),
  })
);

export const siteHistory = pgTable(
  "site_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    yearOrDate: text("year_or_date").notNull(),
    description: text("description").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ixActiveCreatedAt: index("ix_site_history_active_created_at").on(table.isDeleted, table.createdAt),
  })
);
