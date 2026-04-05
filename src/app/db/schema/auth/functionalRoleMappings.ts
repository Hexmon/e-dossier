import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { positions } from "./positions";
import { users } from "./users";

export const functionalRoleMappings = pgTable(
  "functional_role_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    capabilityKey: text("capability_key").notNull(),
    positionId: uuid("position_id").references(() => positions.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqFunctionalRoleMappingsCapabilityKey: uniqueIndex("uq_functional_role_mappings_capability_key").on(
      table.capabilityKey
    ),
  })
);

export type FunctionalRoleMapping = typeof functionalRoleMappings.$inferSelect;
