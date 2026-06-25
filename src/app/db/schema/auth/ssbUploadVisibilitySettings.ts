import { date, index, integer, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { courses } from "@/app/db/schema/training/courses";
import { positions } from "./positions";
import { users } from "./users";

export const ssbUploadVisibilitySettings = pgTable(
  "ssb_upload_visibility_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    positionId: uuid("position_id").notNull().references(() => positions.id, { onDelete: "cascade" }),
    hiddenDays: integer("hidden_days").notNull().default(0),
    visibleUntil: date("visible_until", { mode: "string" }).notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqCoursePosition: uniqueIndex("uq_ssb_upload_visibility_course_position").on(table.courseId, table.positionId),
    ixCourse: index("ix_ssb_upload_visibility_course").on(table.courseId),
    ixPosition: index("ix_ssb_upload_visibility_position").on(table.positionId),
  })
);
