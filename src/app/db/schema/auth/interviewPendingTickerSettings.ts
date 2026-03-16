import { index, integer, pgTable, timestamp, uuid, date } from "drizzle-orm/pg-core";
import { users } from "./users";

export const interviewPendingTickerSettings = pgTable(
  "interview_pending_ticker_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    days: integer("days").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ixCreatedAt: index("ix_interview_pending_ticker_settings_created_at").on(table.createdAt),
    ixCreatedBy: index("ix_interview_pending_ticker_settings_created_by").on(table.createdBy),
  })
);
