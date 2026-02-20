import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { ocCadets } from "./oc";
import { courses } from "./courses";
import { users } from "@/app/db/schema/auth/users";

export const ocMovementKind = pgEnum("oc_movement_kind", [
  "TRANSFER",
  "PROMOTION_BATCH",
  "PROMOTION_EXCEPTION",
]);

export const ocRelegations = pgTable(
  "oc_relegations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ocId: uuid("oc_id")
      .notNull()
      .references(() => ocCadets.id, { onDelete: "cascade" }),
    fromCourseId: uuid("from_course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    fromCourseCode: varchar("from_course_code", { length: 32 }).notNull(),
    toCourseId: uuid("to_course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    toCourseCode: varchar("to_course_code", { length: 32 }).notNull(),
    reason: text("reason").notNull(),
    remark: text("remark"),
    pdfObjectKey: varchar("pdf_object_key", { length: 512 }),
    pdfUrl: text("pdf_url"),
    movementKind: ocMovementKind("movement_kind").notNull().default("TRANSFER"),
    performedByUserId: uuid("performed_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    performedAt: timestamp("performed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ocPerformedAtIdx: index("idx_oc_relegations_oc_performed_at").on(table.ocId, table.performedAt),
    fromCourseIdx: index("idx_oc_relegations_from_course").on(table.fromCourseId),
    toCourseIdx: index("idx_oc_relegations_to_course").on(table.toCourseId),
    movementKindPerformedAtIdx: index("idx_oc_relegations_movement_kind_performed_at").on(
      table.movementKind,
      table.performedAt
    ),
  })
);
