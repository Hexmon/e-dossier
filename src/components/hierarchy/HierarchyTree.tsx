"use client";

import { ChevronDown, ChevronRight, Flag, GitBranch, GripVertical, Pencil, Plus, Save, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { HierarchyNodeRecord } from "@/app/lib/api/hierarchyAdminApi";
import type { HierarchyTreeNode, HierarchyDropPosition } from "@/app/lib/hierarchy-tree";

export type HierarchyInlineDraft = {
  key: string;
  name: string;
  nodeType: "ROOT" | "GROUP" | "PLATOON";
  parentId: string;
  platoonId: string;
};

type HierarchyTreeProps = {
  tree: HierarchyTreeNode[];
  nodeOptions: HierarchyNodeRecord[];
  platoonOptions: Array<{ id: string; key?: string | null; name: string }>;
  selectedNodeId: string | null;
  expandedNodeIds: Set<string>;
  draggingNodeId: string | null;
  deletePendingNodeId: string | null;
  editingNodeId: string | null;
  editingDraft: HierarchyInlineDraft | null;
  savingNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
  onDragStart: (nodeId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetNodeId: string, position: HierarchyDropPosition) => void;
  onAddChild: (parentId: string, nodeType: "GROUP" | "PLATOON") => void;
  onEdit: (nodeId: string) => void;
  onEditDraftChange: (draft: HierarchyInlineDraft) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
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
  nodeOptions,
  platoonOptions,
  selectedNodeId,
  expandedNodeIds,
  draggingNodeId,
  deletePendingNodeId,
  editingNodeId,
  editingDraft,
  savingNodeId,
  onSelectNode,
  onToggleNode,
  onDragStart,
  onDragEnd,
  onDrop,
  onAddChild,
  onEdit,
  onEditDraftChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: Omit<HierarchyTreeProps, "tree"> & {
  nodes: HierarchyTreeNode[];
  depth: number;
}) {
  return (
    <div
      className={cn(
        "space-y-2",
        depth > 0 &&
          "relative ml-6 pl-6 before:absolute before:bottom-3 before:left-0 before:top-0 before:w-px before:bg-border"
      )}
    >
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedNodeIds.has(node.id);
        const isSelected = selectedNodeId === node.id;
        const isDragging = draggingNodeId === node.id;
        const activeDraft = editingNodeId === node.id ? editingDraft : null;
        const isEditing = Boolean(activeDraft);
        const isSaving = savingNodeId === node.id;
        const parentOptions = nodeOptions.filter((option) => option.id !== node.id);
        const usedPlatoonIds = new Set(
          nodeOptions
            .filter((option) => option.nodeType === "PLATOON" && option.id !== node.id)
            .map((option) => option.platoonId)
            .filter(Boolean) as string[]
        );
        const availablePlatoons = platoonOptions.filter((platoon) => !usedPlatoonIds.has(platoon.id));

        return (
          <div
            key={node.id}
            className="relative space-y-1"
            data-hierarchy-node-id={node.id}
            data-hierarchy-node-key={node.key}
          >
            {depth > 0 ? <span className="absolute -left-6 top-9 h-px w-6 bg-border" aria-hidden="true" /> : null}

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
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div
                  className="flex min-w-0 flex-1 items-start gap-3"
                  draggable={node.nodeType !== "ROOT" && !isEditing}
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

                  {activeDraft ? (
                    <form
                      className="grid min-w-0 flex-1 gap-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        onSaveEdit();
                      }}
                    >
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.45fr)]">
                        <div className="space-y-1.5">
                          <Label htmlFor={`hierarchy-node-name-${node.id}`}>Name</Label>
                          <Input
                            id={`hierarchy-node-name-${node.id}`}
                            value={activeDraft.name}
                            onChange={(event) =>
                              onEditDraftChange({ ...activeDraft, name: event.target.value })
                            }
                            autoFocus
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`hierarchy-node-key-${node.id}`}>Key</Label>
                          <Input
                            id={`hierarchy-node-key-${node.id}`}
                            value={activeDraft.key}
                            onChange={(event) =>
                              onEditDraftChange({ ...activeDraft, key: event.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label htmlFor={`hierarchy-node-type-${node.id}`}>Type</Label>
                          <select
                            id={`hierarchy-node-type-${node.id}`}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                            value={activeDraft.nodeType}
                            onChange={(event) => {
                              const nodeType = event.target.value as HierarchyInlineDraft["nodeType"];
                              onEditDraftChange({
                                ...activeDraft,
                                nodeType: node.nodeType === "ROOT" ? "ROOT" : nodeType,
                                platoonId: nodeType === "PLATOON" ? activeDraft.platoonId : "",
                              });
                            }}
                            disabled={node.nodeType === "ROOT"}
                          >
                            {node.nodeType === "ROOT" ? (
                              <option value="ROOT">ROOT</option>
                            ) : (
                              <>
                                <option value="GROUP">GROUP</option>
                                <option value="PLATOON">PLATOON</option>
                              </>
                            )}
                          </select>
                        </div>

                        {activeDraft.nodeType !== "ROOT" ? (
                          <div className="space-y-1.5">
                            <Label htmlFor={`hierarchy-node-parent-${node.id}`}>Parent</Label>
                            <select
                              id={`hierarchy-node-parent-${node.id}`}
                              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                              value={activeDraft.parentId}
                              onChange={(event) =>
                                onEditDraftChange({ ...activeDraft, parentId: event.target.value })
                              }
                            >
                              <option value="">None</option>
                              {parentOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name} ({option.nodeType})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}

                        {activeDraft.nodeType === "PLATOON" ? (
                          <div className="space-y-1.5">
                            <Label htmlFor={`hierarchy-node-platoon-${node.id}`}>Platoon</Label>
                            <select
                              id={`hierarchy-node-platoon-${node.id}`}
                              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                              value={activeDraft.platoonId}
                              onChange={(event) =>
                                onEditDraftChange({ ...activeDraft, platoonId: event.target.value })
                              }
                            >
                              <option value="">Select platoon</option>
                              {availablePlatoons.map((platoon) => (
                                <option key={platoon.id} value={platoon.id}>
                                  {platoon.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" size="sm" disabled={isSaving}>
                          <Save className="mr-1 h-4 w-4" />
                          {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={onCancelEdit} disabled={isSaving}>
                          <X className="mr-1 h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onSelectNode(node.id)}
                      onDoubleClick={() => onEdit(node.id)}
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
                  )}
                </div>

                {!isEditing ? (
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
                ) : null}
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
                nodeOptions={nodeOptions}
                platoonOptions={platoonOptions}
                selectedNodeId={selectedNodeId}
                expandedNodeIds={expandedNodeIds}
                draggingNodeId={draggingNodeId}
                deletePendingNodeId={deletePendingNodeId}
                editingNodeId={editingNodeId}
                editingDraft={editingDraft}
                savingNodeId={savingNodeId}
                onSelectNode={onSelectNode}
                onToggleNode={onToggleNode}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDrop={onDrop}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onEditDraftChange={onEditDraftChange}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
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
  return (
    <div className="overflow-x-auto rounded-lg border bg-muted/20 p-4">
      <HierarchyTreeBranch {...props} nodes={props.tree} depth={0} />
    </div>
  );
}
