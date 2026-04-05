import {
  AnyPgColumn,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { platoons } from "./platoons";
import { users } from "./users";

export const orgHierarchyNodeTypeEnum = pgEnum("org_hierarchy_node_type", [
  "ROOT",
  "GROUP",
  "PLATOON",
]);

export const orgHierarchyNodes = pgTable(
  "org_hierarchy_nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 128 }).notNull(),
    name: varchar("name", { length: 256 }).notNull(),
    nodeType: orgHierarchyNodeTypeEnum("node_type").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => orgHierarchyNodes.id, {
      onDelete: "restrict",
    }),
    platoonId: uuid("platoon_id").references(() => platoons.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    uqOrgHierarchyNodesKey: uniqueIndex("uq_org_hierarchy_nodes_key").on(table.key),
    uqOrgHierarchyNodesPlatoonId: uniqueIndex("uq_org_hierarchy_nodes_platoon_id").on(table.platoonId),
  })
);

export type OrgHierarchyNode = typeof orgHierarchyNodes.$inferSelect;
