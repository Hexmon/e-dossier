import type {
  HierarchyNodeRecord,
  HierarchyNodeReorderItem,
} from "@/app/lib/api/hierarchyAdminApi";

export type HierarchyTreeNode = HierarchyNodeRecord & {
  children: HierarchyTreeNode[];
  depth: number;
};

export type HierarchyDropPosition = "inside" | "before" | "after";

export type HierarchyDropTarget = {
  draggedNodeId: string;
  targetNodeId: string;
  position: HierarchyDropPosition;
};

type HierarchyParentIndex = Map<string | null, HierarchyNodeRecord[]>;

function sortNodes(nodes: HierarchyNodeRecord[]) {
  return [...nodes].sort((a, b) => {
    const bySortOrder = Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0);
    if (bySortOrder !== 0) return bySortOrder;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

function buildParentIndex(nodes: HierarchyNodeRecord[]): HierarchyParentIndex {
  const index = new Map<string | null, HierarchyNodeRecord[]>();

  for (const node of nodes) {
    const key = node.parentId ?? null;
    const group = index.get(key) ?? [];
    group.push(node);
    index.set(key, group);
  }

  for (const [key, group] of index.entries()) {
    index.set(key, sortNodes(group));
  }

  return index;
}

function collectDescendantIds(node: HierarchyTreeNode, descendants: Set<string>) {
  for (const child of node.children) {
    descendants.add(child.id);
    collectDescendantIds(child, descendants);
  }
}

export function buildHierarchyTree(nodes: HierarchyNodeRecord[]): HierarchyTreeNode[] {
  const nodeMap = new Map<string, HierarchyTreeNode>();
  const parentIndex = buildParentIndex(nodes);
  const visited = new Set<string>();

  for (const node of nodes) {
    nodeMap.set(node.id, { ...node, children: [], depth: 0 });
  }

  const attachChildren = (parentId: string | null, depth: number): HierarchyTreeNode[] => {
    const children = (parentIndex.get(parentId) ?? []).filter((child) => !visited.has(child.id));

    return children.map((child) => {
      visited.add(child.id);
      const current = nodeMap.get(child.id)!;
      current.depth = depth;
      current.children = attachChildren(child.id, depth + 1);
      return current;
    });
  };

  const roots = attachChildren(null, 0);
  const orphanRoots = sortNodes(nodes)
    .filter((node) => !visited.has(node.id))
    .map((node) => {
      visited.add(node.id);
      const current = nodeMap.get(node.id)!;
      current.depth = 0;
      current.children = attachChildren(node.id, 1);
      return current;
    });

  return [...roots, ...orphanRoots];
}

export function resolveHierarchyDropTarget(
  nodes: HierarchyNodeRecord[],
  dropTarget: HierarchyDropTarget
): { parentId: string | null; siblingIds: string[] } | null {
  if (dropTarget.draggedNodeId === dropTarget.targetNodeId) {
    return null;
  }

  const tree = buildHierarchyTree(nodes);
  const nodeMap = new Map<string, HierarchyTreeNode>();
  for (const root of tree) {
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop()!;
      nodeMap.set(current.id, current);
      for (const child of current.children) {
        stack.push(child);
      }
    }
  }

  const dragged = nodeMap.get(dropTarget.draggedNodeId);
  const target = nodeMap.get(dropTarget.targetNodeId);
  if (!dragged || !target || dragged.nodeType === "ROOT") {
    return null;
  }

  const descendants = new Set<string>();
  collectDescendantIds(dragged, descendants);
  if (descendants.has(target.id)) {
    return null;
  }

  const parentIndex = buildParentIndex(nodes);
  if (dropTarget.position === "inside") {
    const siblingIds = (parentIndex.get(target.id) ?? []).map((node) => node.id);
    const nextSiblingIds = siblingIds.filter((id) => id !== dragged.id);
    nextSiblingIds.push(dragged.id);
    return {
      parentId: target.id,
      siblingIds: nextSiblingIds,
    };
  }

  const parentId = target.parentId ?? null;
  const siblings = (parentIndex.get(parentId) ?? []).map((node) => node.id).filter((id) => id !== dragged.id);
  const targetIndex = siblings.findIndex((id) => id === target.id);
  if (targetIndex < 0) {
    return null;
  }

  const insertionIndex = dropTarget.position === "before" ? targetIndex : targetIndex + 1;
  siblings.splice(insertionIndex, 0, dragged.id);

  return {
    parentId,
    siblingIds: siblings,
  };
}

export function buildHierarchyReorderPayload(
  nodes: HierarchyNodeRecord[],
  dropTarget: HierarchyDropTarget
): HierarchyNodeReorderItem[] | null {
  const dragged = nodes.find((node) => node.id === dropTarget.draggedNodeId);
  if (!dragged || dragged.nodeType === "ROOT") {
    return null;
  }

  const resolved = resolveHierarchyDropTarget(nodes, dropTarget);
  if (!resolved) {
    return null;
  }

  const parentIndex = buildParentIndex(nodes);
  const sourceParentId = dragged.parentId ?? null;
  const payload = new Map<string, HierarchyNodeReorderItem>();

  if (sourceParentId !== resolved.parentId) {
    const sourceSiblingIds = (parentIndex.get(sourceParentId) ?? [])
      .map((node) => node.id)
      .filter((id) => id !== dragged.id);

    sourceSiblingIds.forEach((id, index) => {
      payload.set(id, { id, parentId: sourceParentId, sortOrder: index });
    });
  }

  resolved.siblingIds.forEach((id, index) => {
    payload.set(id, { id, parentId: resolved.parentId, sortOrder: index });
  });

  const nextPayload = [...payload.values()];
  const changed = nextPayload.filter((item) => {
    const current = nodes.find((node) => node.id === item.id);
    if (!current) return true;
    return (current.parentId ?? null) !== item.parentId || Number(current.sortOrder ?? 0) !== item.sortOrder;
  });

  return changed.length > 0 ? changed : null;
}
