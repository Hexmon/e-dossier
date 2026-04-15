import { describe, expect, it } from "vitest";

import {
  buildHierarchyReorderPayload,
  buildHierarchyTree,
  resolveHierarchyDropTarget,
  type HierarchyDropTarget,
} from "@/app/lib/hierarchy-tree";
import type { HierarchyNodeRecord } from "@/app/lib/api/hierarchyAdminApi";

const baseTimestamps = {
  createdAt: "2026-04-12T00:00:00.000Z",
  updatedAt: "2026-04-12T00:00:00.000Z",
};

function makeNode(overrides: Partial<HierarchyNodeRecord>): HierarchyNodeRecord {
  return {
    id: "00000000-0000-4000-8000-000000000000",
    key: "NODE",
    name: "Node",
    nodeType: "GROUP",
    parentId: null,
    platoonId: null,
    sortOrder: 0,
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
    ...baseTimestamps,
    ...overrides,
  };
}

describe("hierarchy tree utilities", () => {
  const nodes: HierarchyNodeRecord[] = [
    makeNode({
      id: "10000000-0000-4000-8000-000000000000",
      key: "ROOT",
      name: "Root",
      nodeType: "ROOT",
    }),
    makeNode({
      id: "20000000-0000-4000-8000-000000000000",
      key: "GROUP_ALPHA",
      name: "Group Alpha",
      parentId: "10000000-0000-4000-8000-000000000000",
      sortOrder: 0,
    }),
    makeNode({
      id: "30000000-0000-4000-8000-000000000000",
      key: "PLATOON_ONE",
      name: "Platoon One",
      nodeType: "PLATOON",
      parentId: "20000000-0000-4000-8000-000000000000",
      platoonId: "90000000-0000-4000-8000-000000000000",
      sortOrder: 0,
    }),
    makeNode({
      id: "40000000-0000-4000-8000-000000000000",
      key: "GROUP_BRAVO",
      name: "Group Bravo",
      parentId: "10000000-0000-4000-8000-000000000000",
      sortOrder: 1,
    }),
  ];

  it("builds nested hierarchy from flat nodes", () => {
    const tree = buildHierarchyTree(nodes);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("10000000-0000-4000-8000-000000000000");
    expect(tree[0].children.map((child) => child.id)).toEqual([
      "20000000-0000-4000-8000-000000000000",
      "40000000-0000-4000-8000-000000000000",
    ]);
    expect(tree[0].children[0].children[0].id).toBe("30000000-0000-4000-8000-000000000000");
  });

  it("resolves inside drop target as append-to-children", () => {
    const dropTarget: HierarchyDropTarget = {
      draggedNodeId: "40000000-0000-4000-8000-000000000000",
      targetNodeId: "20000000-0000-4000-8000-000000000000",
      position: "inside",
    };

    expect(resolveHierarchyDropTarget(nodes, dropTarget)).toEqual({
      parentId: "20000000-0000-4000-8000-000000000000",
      siblingIds: [
        "30000000-0000-4000-8000-000000000000",
        "40000000-0000-4000-8000-000000000000",
      ],
    });
  });

  it("rejects dropping a node into its own descendant subtree", () => {
    const dropTarget: HierarchyDropTarget = {
      draggedNodeId: "20000000-0000-4000-8000-000000000000",
      targetNodeId: "30000000-0000-4000-8000-000000000000",
      position: "inside",
    };

    expect(resolveHierarchyDropTarget(nodes, dropTarget)).toBeNull();
  });

  it("builds reorder payload for cross-parent move", () => {
    const dropTarget: HierarchyDropTarget = {
      draggedNodeId: "40000000-0000-4000-8000-000000000000",
      targetNodeId: "20000000-0000-4000-8000-000000000000",
      position: "inside",
    };

    expect(buildHierarchyReorderPayload(nodes, dropTarget)).toEqual([
      {
        id: "40000000-0000-4000-8000-000000000000",
        parentId: "20000000-0000-4000-8000-000000000000",
        sortOrder: 1,
      },
    ]);
  });

  it("builds reorder payload for sibling reorder", () => {
    const dropTarget: HierarchyDropTarget = {
      draggedNodeId: "40000000-0000-4000-8000-000000000000",
      targetNodeId: "20000000-0000-4000-8000-000000000000",
      position: "before",
    };

    expect(buildHierarchyReorderPayload(nodes, dropTarget)).toEqual([
      {
        id: "40000000-0000-4000-8000-000000000000",
        parentId: "10000000-0000-4000-8000-000000000000",
        sortOrder: 0,
      },
      {
        id: "20000000-0000-4000-8000-000000000000",
        parentId: "10000000-0000-4000-8000-000000000000",
        sortOrder: 1,
      },
    ]);
  });
});
