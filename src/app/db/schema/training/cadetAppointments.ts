import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { platoons } from "@/app/db/schema/auth/platoons";
import { users } from "@/app/db/schema/auth/users";
import { ocCadets } from "./oc";

export const cadetAppointments = pgTable(
  "cadet_appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cadetId: uuid("cadet_id")
      .notNull()
      .references(() => ocCadets.id, { onDelete: "restrict" }),
    platoonId: uuid("platoon_id")
      .notNull()
      .references(() => platoons.id, { onDelete: "restrict" }),
    appointmentName: varchar("appointment_name", { length: 128 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    appointedBy: uuid("appointed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    endedBy: uuid("ended_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idxCadetAppointmentsPlatoon: index("idx_cadet_appointments_platoon").on(
      table.platoonId,
      table.startsAt
    ),
    idxCadetAppointmentsCadet: index("idx_cadet_appointments_cadet").on(
      table.cadetId,
      table.startsAt
    ),
  })
);
