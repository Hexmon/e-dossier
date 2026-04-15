"use client";

import { ChevronDown, ChevronRight, Flag, GitBranch, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HierarchyTreeNode, HierarchyDropPosition } from "@/app/lib/hierarchy-tree";

type HierarchyTreeProps = {
  tree: HierarchyTreeNode[];
  selectedNodeId: string | null;
  expandedNodeIds: Set<string>;
  draggingNodeId: string | null;
  deletePendingNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
  onDragStart: (nodeId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetNodeId: string, position: HierarchyDropPosition) => void;
  onAddChild: (parentId: string, nodeType: "GROUP" | "PLATOON") => void;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
};

function HierarchyDropZone({
  active,
  label,
  onDrop,
}: {
  active: boolean;
  label: string;
  onDrop: () => void;
}) {
  return (
    <div
      aria-label={label}
      className={cn(
        "mx-3 h-3 rounded-md border border-dashed border-transparent transition-colors",
        active ? "border-primary/50 bg-primary/10" : "hover:border-primary/30 hover:bg-primary/5"
      )}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    />
  );
}

function typeBadgeVariant(nodeType: HierarchyTreeNode["nodeType"]) {
  switch (nodeType) {
    case "ROOT":
      return "default";
    case "PLATOON":
      return "secondary";
    default:
      return "outline";
  }
}

function HierarchyTreeBranch({
  nodes,
  depth,
  selectedNodeId,
  expandedNodeIds,
  draggingNodeId,
  deletePendingNodeId,
  onSelectNode,
  onToggleNode,
  onDragStart,
  onDragEnd,
  onDrop,
  onAddChild,
  onEdit,
  onDelete,
}: Omit<HierarchyTreeProps, "tree"> & {
  nodes: HierarchyTreeNode[];
  depth: number;
}) {
  return (
    <div className={cn("space-y-1", depth > 0 && "ml-5 border-l border-border/70 pl-4")}>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedNodeIds.has(node.id);
        const isSelected = selectedNodeId === node.id;
        const isDragging = draggingNodeId === node.id;

        return (
          <div key={node.id} className="space-y-1" data-hierarchy-node-id={node.id} data-hierarchy-node-key={node.key}>
            {draggingNodeId ? (
              <HierarchyDropZone
                active={draggingNodeId !== node.id}
                label={`Drop before ${node.name}`}
                onDrop={() => onDrop(node.id, "before")}
              />
            ) : null}

            <div
              className={cn(
                "rounded-lg border bg-card p-3 shadow-xs transition",
                isSelected && "border-primary bg-primary/5 shadow-sm",
                isDragging && "opacity-50"
              )}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div
                  className="flex min-w-0 flex-1 items-start gap-3"
                  draggable={node.nodeType !== "ROOT"}
                  onDragStart={() => onDragStart(node.id)}
                  onDragEnd={onDragEnd}
                >
                  <div className="flex items-center gap-1 pt-0.5">
                    {hasChildren ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => onToggleNode(node.id)}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground">
                        <GitBranch className="h-4 w-4" />
                      </span>
                    )}
                    {node.nodeType !== "ROOT" ? (
                      <span className="inline-flex h-7 w-7 cursor-grab items-center justify-center text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground">
                        <Flag className="h-4 w-4" />
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelectNode(node.id)}
                    onDragOver={(event) => {
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      onDrop(node.id, "inside");
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold sm:text-base">{node.name}</span>
                      <Badge variant={typeBadgeVariant(node.nodeType)}>{node.nodeType}</Badge>
                      {node.platoonName ? <Badge variant="outline">{node.platoonName}</Badge> : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      <span>Key: {node.key}</span>
                      {hasChildren ? <span> • Children: {node.children.length}</span> : null}
                    </div>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onAddChild(node.id, "GROUP")}>
                    <Plus className="mr-1 h-4 w-4" />
                    Group
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => onAddChild(node.id, "PLATOON")}>
                    <Plus className="mr-1 h-4 w-4" />
                    Platoon
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => onEdit(node.id)}>
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  {node.nodeType !== "ROOT" ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(node.id)}
                      disabled={deletePendingNodeId === node.id}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      {deletePendingNodeId === node.id ? "Deleting..." : "Delete"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            {draggingNodeId ? (
              <HierarchyDropZone
                active={draggingNodeId !== node.id}
                label={`Drop after ${node.name}`}
                onDrop={() => onDrop(node.id, "after")}
              />
            ) : null}

            {hasChildren && isExpanded ? (
              <HierarchyTreeBranch
                nodes={node.children}
                depth={depth + 1}
                selectedNodeId={selectedNodeId}
                expandedNodeIds={expandedNodeIds}
                draggingNodeId={draggingNodeId}
                deletePendingNodeId={deletePendingNodeId}
                onSelectNode={onSelectNode}
                onToggleNode={onToggleNode}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDrop={onDrop}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function HierarchyTree(props: HierarchyTreeProps) {
  return <HierarchyTreeBranch {...props} nodes={props.tree} depth={0} />;
}
