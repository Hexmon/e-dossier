import { and, eq, isNull, ne, sql } from "drizzle-orm";

import { ApiError } from "@/app/lib/http";
import { db } from "@/app/db/client";
import { appointments } from "@/app/db/schema/auth/appointments";
import { delegations } from "@/app/db/schema/auth/delegations";
import { orgHierarchyNodes } from "@/app/db/schema/auth/orgHierarchyNodes";
import { platoons } from "@/app/db/schema/auth/platoons";

export type HierarchyNodePayload = {
  key: string;
  name: string;
  nodeType: "ROOT" | "GROUP" | "PLATOON";
  parentId?: string | null;
  platoonId?: string | null;
  sortOrder?: number;
};

export type HierarchyNodeReorderItem = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

const HIERARCHY_NODE_SELECT = {
  id: orgHierarchyNodes.id,
  key: orgHierarchyNodes.key,
  name: orgHierarchyNodes.name,
  nodeType: orgHierarchyNodes.nodeType,
  parentId: orgHierarchyNodes.parentId,
  platoonId: orgHierarchyNodes.platoonId,
  sortOrder: orgHierarchyNodes.sortOrder,
  createdBy: orgHierarchyNodes.createdBy,
  updatedBy: orgHierarchyNodes.updatedBy,
  createdAt: orgHierarchyNodes.createdAt,
  updatedAt: orgHierarchyNodes.updatedAt,
  deletedAt: orgHierarchyNodes.deletedAt,
  platoonKey: platoons.key,
  platoonName: platoons.name,
} as const;

function listHierarchyNodesQuery(executor: any) {
  return executor
    .select(HIERARCHY_NODE_SELECT)
    .from(orgHierarchyNodes)
    .leftJoin(platoons, eq(platoons.id, orgHierarchyNodes.platoonId))
    .where(isNull(orgHierarchyNodes.deletedAt))
    .orderBy(orgHierarchyNodes.sortOrder, orgHierarchyNodes.createdAt);
}

export async function listHierarchyNodes() {
  return listHierarchyNodesQuery(db);
}

async function getNodeById(id: string) {
  const [node] = await db
    .select()
    .from(orgHierarchyNodes)
    .where(eq(orgHierarchyNodes.id, id))
    .limit(1);

  return node ?? null;
}

async function assertParentExists(parentId: string | null | undefined) {
  if (!parentId) return null;
  const parent = await getNodeById(parentId);
  if (!parent || parent.deletedAt) {
    throw new ApiError(400, "Parent hierarchy node does not exist.", "invalid_parent");
  }
  return parent;
}

async function assertPlatoonNodeRules(input: {
  nodeType: "ROOT" | "GROUP" | "PLATOON";
  platoonId?: string | null;
  nodeIdToExclude?: string;
}) {
  if (input.nodeType === "PLATOON") {
    if (!input.platoonId) {
      throw new ApiError(400, "platoonId is required for PLATOON nodes.", "invalid_platoon_node");
    }

    const [platoon] = await db
      .select({ id: platoons.id })
      .from(platoons)
      .where(and(eq(platoons.id, input.platoonId), isNull(platoons.deletedAt)))
      .limit(1);

    if (!platoon) {
      throw new ApiError(400, "Referenced platoon does not exist.", "invalid_platoon_node");
    }

    const existing = await db
      .select({ id: orgHierarchyNodes.id })
      .from(orgHierarchyNodes)
      .where(
        and(
          eq(orgHierarchyNodes.platoonId, input.platoonId),
          isNull(orgHierarchyNodes.deletedAt),
          input.nodeIdToExclude ? ne(orgHierarchyNodes.id, input.nodeIdToExclude) : sql`true`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ApiError(409, "Each platoon can only appear once in the hierarchy tree.", "duplicate_platoon_node");
    }

    return;
  }

  if (input.platoonId) {
    throw new ApiError(400, "platoonId is only allowed for PLATOON nodes.", "invalid_platoon_node");
  }
}

async function assertSingleRoot(input: { nodeType: "ROOT" | "GROUP" | "PLATOON"; nodeIdToExclude?: string }) {
  if (input.nodeType !== "ROOT") return;

  const root = await db
    .select({ id: orgHierarchyNodes.id })
    .from(orgHierarchyNodes)
    .where(
      and(
        eq(orgHierarchyNodes.nodeType, "ROOT"),
        isNull(orgHierarchyNodes.deletedAt),
        input.nodeIdToExclude ? ne(orgHierarchyNodes.id, input.nodeIdToExclude) : sql`true`
      )
    )
    .limit(1);

  if (root.length > 0) {
    throw new ApiError(409, "Only one ROOT node is allowed.", "duplicate_root");
  }
}

async function assertNoCycle(nodeId: string, nextParentId: string | null | undefined) {
  let currentParentId = nextParentId ?? null;
  while (currentParentId) {
    if (currentParentId === nodeId) {
      throw new ApiError(409, "Hierarchy cycles are not allowed.", "hierarchy_cycle");
    }

    const parent = await getNodeById(currentParentId);
    if (!parent || parent.deletedAt) {
      throw new ApiError(400, "Parent hierarchy node does not exist.", "invalid_parent");
    }
    currentParentId = parent.parentId ?? null;
  }
}

export async function createHierarchyNode(input: HierarchyNodePayload, actorUserId: string) {
  await assertSingleRoot({ nodeType: input.nodeType });
  const parent = await assertParentExists(input.parentId ?? null);
  await assertPlatoonNodeRules({ nodeType: input.nodeType, platoonId: input.platoonId ?? null });

  if (input.nodeType === "ROOT" && input.parentId) {
    throw new ApiError(400, "ROOT nodes cannot have a parent.", "invalid_root");
  }

  if (input.nodeType === "PLATOON" && !parent) {
    throw new ApiError(400, "PLATOON nodes must be attached to a parent node.", "invalid_parent");
  }

  const [created] = await db
    .insert(orgHierarchyNodes)
    .values({
      key: input.key.trim(),
      name: input.name.trim(),
      nodeType: input.nodeType,
      parentId: input.parentId ?? null,
      platoonId: input.platoonId ?? null,
      sortOrder: input.sortOrder ?? 0,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  return created;
}

export async function updateHierarchyNode(id: string, input: Partial<HierarchyNodePayload>, actorUserId: string) {
  const existing = await getNodeById(id);
  if (!existing || existing.deletedAt) {
    throw new ApiError(404, "Hierarchy node not found.", "not_found");
  }

  const nextNodeType = input.nodeType ?? existing.nodeType;
  const nextParentId = input.parentId !== undefined ? input.parentId : existing.parentId;
  const nextPlatoonId = input.platoonId !== undefined ? input.platoonId : existing.platoonId;

  if (existing.nodeType === "ROOT" && nextNodeType !== "ROOT") {
    throw new ApiError(400, "The ROOT node type is immutable.", "invalid_root");
  }
  if (existing.nodeType === "ROOT" && nextParentId) {
    throw new ApiError(400, "ROOT nodes cannot have a parent.", "invalid_root");
  }

  await assertSingleRoot({ nodeType: nextNodeType, nodeIdToExclude: existing.id });
  await assertParentExists(nextParentId ?? null);
  await assertPlatoonNodeRules({
    nodeType: nextNodeType,
    platoonId: nextPlatoonId ?? null,
    nodeIdToExclude: existing.id,
  });
  await assertNoCycle(existing.id, nextParentId ?? null);

  const [childCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orgHierarchyNodes)
    .where(and(eq(orgHierarchyNodes.parentId, existing.id), isNull(orgHierarchyNodes.deletedAt)));

  if ((childCount?.count ?? 0) > 0 && nextNodeType === "PLATOON" && existing.nodeType !== "PLATOON") {
    throw new ApiError(409, "Nodes with children cannot be converted into PLATOON nodes.", "invalid_conversion");
  }

  const [updated] = await db
    .update(orgHierarchyNodes)
    .set({
      ...(input.key !== undefined ? { key: input.key.trim() } : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.nodeType !== undefined ? { nodeType: input.nodeType } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.platoonId !== undefined ? { platoonId: input.platoonId } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(orgHierarchyNodes.id, id))
    .returning();

  return updated;
}

async function assertNoActivePlatoonReferences(platoonId: string) {
  const [appointmentRefs, delegationRefs] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments)
      .where(
        and(
          eq(appointments.scopeType, "PLATOON"),
          eq(appointments.scopeId, platoonId),
          isNull(appointments.deletedAt),
          sql`${appointments.startsAt} <= now()`,
          sql`(${appointments.endsAt} IS NULL OR ${appointments.endsAt} > now())`
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(delegations)
      .where(
        and(
          eq(delegations.scopeType, "PLATOON"),
          eq(delegations.scopeId, platoonId),
          isNull(delegations.deletedAt),
          isNull(delegations.terminatedAt),
          sql`${delegations.startsAt} <= now()`,
          sql`(${delegations.endsAt} IS NULL OR ${delegations.endsAt} > now())`
        )
      ),
  ]);

  if ((appointmentRefs[0]?.count ?? 0) > 0 || (delegationRefs[0]?.count ?? 0) > 0) {
    throw new ApiError(
      409,
      "This platoon node is still referenced by active appointments or delegations.",
      "active_scope_reference"
    );
  }
}

export async function deleteHierarchyNode(id: string, actorUserId: string) {
  const existing = await getNodeById(id);
  if (!existing || existing.deletedAt) {
    throw new ApiError(404, "Hierarchy node not found.", "not_found");
  }
  if (existing.nodeType === "ROOT") {
    throw new ApiError(400, "The ROOT node cannot be deleted.", "invalid_root");
  }

  const [children] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orgHierarchyNodes)
    .where(and(eq(orgHierarchyNodes.parentId, id), isNull(orgHierarchyNodes.deletedAt)));

  if ((children?.count ?? 0) > 0) {
    throw new ApiError(409, "Delete child hierarchy nodes first.", "node_has_children");
  }

  if (existing.nodeType === "PLATOON" && existing.platoonId) {
    await assertNoActivePlatoonReferences(existing.platoonId);
  }

  const [deleted] = await db
    .update(orgHierarchyNodes)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
      updatedBy: actorUserId,
    })
    .where(eq(orgHierarchyNodes.id, id))
    .returning();

  return deleted;
}

export async function reorderHierarchyNodes(items: HierarchyNodeReorderItem[], actorUserId: string) {
  return db.transaction(async (tx) => {
    const activeNodes = await tx
      .select()
      .from(orgHierarchyNodes)
      .where(isNull(orgHierarchyNodes.deletedAt));

    const activeNodeMap = new Map(activeNodes.map((node) => [node.id, node]));
    const workingParentById = new Map(activeNodes.map((node) => [node.id, node.parentId ?? null]));
    const usedSortOrdersByParent = new Map<string, Set<number>>();

    for (const item of items) {
      const node = activeNodeMap.get(item.id);
      if (!node) {
        throw new ApiError(404, "Hierarchy node not found.", "not_found");
      }

      if (node.nodeType === "ROOT" && item.parentId !== null) {
        throw new ApiError(400, "The ROOT node cannot be moved under another node.", "invalid_root");
      }

      if (item.parentId) {
        const parent = activeNodeMap.get(item.parentId);
        if (!parent) {
          throw new ApiError(400, "Parent hierarchy node does not exist.", "invalid_parent");
        }
      }

      const sortKey = item.parentId ?? "__root__";
      const usedSortOrders = usedSortOrdersByParent.get(sortKey) ?? new Set<number>();
      if (usedSortOrders.has(item.sortOrder)) {
        throw new ApiError(400, "Sort order must be unique within the same parent.", "invalid_reorder");
      }
      usedSortOrders.add(item.sortOrder);
      usedSortOrdersByParent.set(sortKey, usedSortOrders);

      workingParentById.set(item.id, item.parentId);
    }

    for (const item of items) {
      let currentParentId = workingParentById.get(item.id) ?? null;
      const seen = new Set<string>([item.id]);

      while (currentParentId) {
        if (seen.has(currentParentId)) {
          throw new ApiError(409, "Hierarchy cycles are not allowed.", "hierarchy_cycle");
        }
        seen.add(currentParentId);
        currentParentId = workingParentById.get(currentParentId) ?? null;
      }
    }

    for (const item of items) {
      await tx
        .update(orgHierarchyNodes)
        .set({
          parentId: item.parentId,
          sortOrder: item.sortOrder,
          updatedBy: actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(orgHierarchyNodes.id, item.id));
    }

    return listHierarchyNodesQuery(tx);
  });
}
