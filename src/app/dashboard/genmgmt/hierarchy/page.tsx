"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Network, Plus, SquarePen } from "lucide-react";
import { toast } from "sonner";

import { ApiClientError } from "@/app/lib/apiClient";
import {
  hierarchyAdminApi,
  type HierarchyNodeInput,
  type HierarchyNodeRecord,
  type HierarchyNodeReorderItem,
} from "@/app/lib/api/hierarchyAdminApi";
import { buildHierarchyReorderPayload, buildHierarchyTree, type HierarchyDropPosition } from "@/app/lib/hierarchy-tree";
import { getPositions, type Position } from "@/app/lib/api/appointmentApi";
import { getPlatoons, type Platoon } from "@/app/lib/api/platoonApi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import HierarchyTree, { type HierarchyInlineDraft } from "@/components/hierarchy/HierarchyTree";
import { SetupReturnBanner } from "@/components/setup/SetupReturnBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMe } from "@/hooks/useMe";

type InspectorState =
  | {
      mode: "create";
      parentId: string | null;
      nodeType: "ROOT" | "GROUP" | "PLATOON";
    }
  | {
      mode: "edit";
      nodeId: string;
    }
  | null;

type HierarchyInspectorDraft = HierarchyInlineDraft;

const EMPTY_HIERARCHY_NODES: HierarchyNodeRecord[] = [];
const EMPTY_PLATOONS: Platoon[] = [];
const EMPTY_POSITIONS: Position[] = [];

function parseApiError(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) {
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

function makeCreateDraft(
  parentId: string | null,
  nodeType: "ROOT" | "GROUP" | "PLATOON"
): HierarchyInspectorDraft {
  return {
    key: nodeType === "ROOT" ? "CTW_ROOT" : "",
    name: nodeType === "ROOT" ? "Cadets Training Wing" : "",
    nodeType,
    parentId: parentId ?? "",
    platoonId: "",
  };
}

function makeDraftFromNode(node: HierarchyNodeRecord): HierarchyInlineDraft {
  return {
    key: node.key,
    name: node.name,
    nodeType: node.nodeType,
    parentId: node.parentId ?? "",
    platoonId: node.platoonId ?? "",
  };
}

export default function HierarchyManagementPage() {
  const queryClient = useQueryClient();
  const { data: meData } = useMe();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([]);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [inspectorState, setInspectorState] = useState<InspectorState>(null);
  const [inspectorDraft, setInspectorDraft] = useState<HierarchyInspectorDraft | null>(null);
  const [inlineEditNodeId, setInlineEditNodeId] = useState<string | null>(null);
  const [inlineEditDraft, setInlineEditDraft] = useState<HierarchyInlineDraft | null>(null);
  const [commanderPositionId, setCommanderPositionId] = useState<string>("");

  const hierarchyQuery = useQuery({
    queryKey: ["hierarchy-nodes"],
    queryFn: () => hierarchyAdminApi.listNodes(),
  });
  const mappingQuery = useQuery({
    queryKey: ["hierarchy-functional-role-mapping"],
    queryFn: () => hierarchyAdminApi.getFunctionalRoleMappings(),
  });
  const platoonsQuery = useQuery({
    queryKey: ["hierarchy-platoons"],
    queryFn: getPlatoons,
  });
  const positionsQuery = useQuery({
    queryKey: ["hierarchy-positions"],
    queryFn: getPositions,
  });

  const nodeOptions = hierarchyQuery.data?.items ?? EMPTY_HIERARCHY_NODES;
  const tree = useMemo(() => buildHierarchyTree(nodeOptions), [nodeOptions]);
  const rootNode = useMemo(
    () => nodeOptions.find((node) => node.nodeType === "ROOT") ?? null,
    [nodeOptions]
  );
  const selectedNode = useMemo(
    () => nodeOptions.find((node) => node.id === selectedNodeId) ?? rootNode ?? null,
    [nodeOptions, rootNode, selectedNodeId]
  );
  const platoonOptions = platoonsQuery.data ?? EMPTY_PLATOONS;
  const positions = positionsQuery.data ?? EMPTY_POSITIONS;
  const isSuperAdmin = useMemo(
    () => (meData?.roles ?? []).some((role) => String(role).toUpperCase() === "SUPER_ADMIN"),
    [meData?.roles]
  );
  const commanderCandidates = positions.filter((position) =>
    isSuperAdmin ? true : position.defaultScope === "PLATOON"
  );

  useEffect(() => {
    const nextValue =
      mappingQuery.data?.configured?.positionId ?? mappingQuery.data?.effective?.positionId ?? "";
    setCommanderPositionId(nextValue);
  }, [mappingQuery.data?.configured?.positionId, mappingQuery.data?.effective?.positionId]);

  useEffect(() => {
    if (nodeOptions.length === 0) {
      setSelectedNodeId(null);
      return;
    }

    setSelectedNodeId((current) => {
      if (current && nodeOptions.some((node) => node.id === current)) {
        return current;
      }
      return rootNode?.id ?? nodeOptions[0]?.id ?? null;
    });
  }, [nodeOptions, rootNode?.id]);

  useEffect(() => {
    const nextExpandedIds = nodeOptions
      .filter((node) => node.nodeType !== "PLATOON")
      .map((node) => node.id);

    setExpandedNodeIds((current) => {
      const merged = Array.from(new Set([...current, ...nextExpandedIds]));
      if (merged.length === current.length && merged.every((id, index) => id === current[index])) {
        return current;
      }
      return merged;
    });
  }, [nodeOptions]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["hierarchy-nodes"] }),
      queryClient.invalidateQueries({ queryKey: ["hierarchy-functional-role-mapping"] }),
      queryClient.invalidateQueries({ queryKey: ["navigation", "me"] }),
      queryClient.invalidateQueries({ queryKey: ["me"] }),
    ]);
  };

  const getNextSortOrder = (parentId: string | null) => {
    const currentMax = nodeOptions
      .filter((node) => (node.parentId ?? null) === parentId)
      .reduce((max, node) => Math.max(max, Number(node.sortOrder ?? 0)), -1);

    return currentMax + 1;
  };

  const createNodeMutation = useMutation({
    mutationFn: async (payload: HierarchyNodeInput) => hierarchyAdminApi.createNode(payload),
    onSuccess: async () => {
      toast.success("Hierarchy node created.");
      setInspectorState(null);
      setInspectorDraft(null);
      await refresh();
    },
    onError: (error: unknown) => {
      toast.error(parseApiError(error, "Failed to create hierarchy node."));
    },
  });

  const updateNodeMutation = useMutation({
    mutationFn: async ({ nodeId, payload }: { nodeId: string; payload: Partial<HierarchyNodeInput> }) =>
      hierarchyAdminApi.updateNode(nodeId, payload),
    onSuccess: async () => {
      toast.success("Hierarchy node updated.");
      setInspectorState(null);
      setInspectorDraft(null);
      setInlineEditNodeId(null);
      setInlineEditDraft(null);
      await refresh();
    },
    onError: (error: unknown) => {
      toast.error(parseApiError(error, "Failed to update hierarchy node."));
    },
  });

  const reorderNodeMutation = useMutation({
    mutationFn: async (payload: HierarchyNodeReorderItem[]) => hierarchyAdminApi.reorderNodes(payload),
    onSuccess: async () => {
      toast.success("Hierarchy tree updated.");
      await refresh();
    },
    onError: (error: unknown) => {
      toast.error(parseApiError(error, "Failed to reorder hierarchy nodes."));
    },
    onSettled: () => {
      setDraggingNodeId(null);
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: string) => hierarchyAdminApi.deleteNode(nodeId),
    onSuccess: async () => {
      toast.success("Hierarchy node deleted.");
      setInspectorState(null);
      setInspectorDraft(null);
      setInlineEditNodeId(null);
      setInlineEditDraft(null);
      await refresh();
    },
    onError: (error: unknown) => {
      toast.error(parseApiError(error, "Failed to delete hierarchy node."));
    },
  });

  const updateCommanderMutation = useMutation({
    mutationFn: async (nextPositionId: string | null) =>
      hierarchyAdminApi.updateCommanderEquivalentMapping(nextPositionId),
    onSuccess: async () => {
      toast.success("Commander-equivalent mapping updated.");
      await refresh();
    },
    onError: (error: unknown) => {
      toast.error(parseApiError(error, "Failed to update functional mapping."));
    },
  });

  const availablePlatoonOptions = useMemo(() => {
    const currentNodeId = inspectorState?.mode === "edit" ? inspectorState.nodeId : null;
    const usedPlatoonIds = new Set(
      nodeOptions
        .filter((node) => node.nodeType === "PLATOON" && node.id !== currentNodeId)
        .map((node) => node.platoonId)
        .filter(Boolean) as string[]
    );

    return platoonOptions.filter((platoon) => !usedPlatoonIds.has(platoon.id));
  }, [inspectorState, nodeOptions, platoonOptions]);

  const parentOptions = useMemo(() => {
    if (!inspectorState) return nodeOptions;
    if (inspectorState.mode === "create") {
      return nodeOptions;
    }
    return nodeOptions.filter((node) => node.id !== inspectorState.nodeId);
  }, [inspectorState, nodeOptions]);

  const effectiveMapping = mappingQuery.data?.effective ?? null;
  const configuredMapping = mappingQuery.data?.configured ?? null;

  const openCreateInspector = (parentId: string | null, nodeType: "ROOT" | "GROUP" | "PLATOON") => {
    setInspectorState({ mode: "create", parentId, nodeType });
    setInspectorDraft(makeCreateDraft(parentId, nodeType));
  };

  const openCreateRootInspector = () => {
    openCreateInspector(null, "ROOT");
  };

  const openInlineEditor = (nodeId: string) => {
    const node = nodeOptions.find((candidate) => candidate.id === nodeId);
    if (!node) return;

    setSelectedNodeId(node.id);
    setInspectorState(null);
    setInspectorDraft(null);
    setInlineEditNodeId(node.id);
    setInlineEditDraft(makeDraftFromNode(node));
  };

  const closeInspector = () => {
    setInspectorState(null);
    setInspectorDraft(null);
  };

  const cancelInlineEditor = () => {
    setInlineEditNodeId(null);
    setInlineEditDraft(null);
  };

  const submitInspector = () => {
    if (!inspectorDraft || !inspectorState) return;

    if (!inspectorDraft.key.trim() || !inspectorDraft.name.trim()) {
      toast.error("Key and name are required.");
      return;
    }

    if (inspectorDraft.nodeType !== "ROOT" && !inspectorDraft.parentId) {
      toast.error("Parent node is required.");
      return;
    }

    if (inspectorDraft.nodeType === "PLATOON" && !inspectorDraft.platoonId) {
      toast.error("Platoon is required for platoon nodes.");
      return;
    }

    if (inspectorState.mode === "create") {
      const parentId = inspectorDraft.nodeType === "ROOT" ? null : inspectorDraft.parentId || null;
      createNodeMutation.mutate({
        key: inspectorDraft.key.trim(),
        name: inspectorDraft.name.trim(),
        nodeType: inspectorDraft.nodeType,
        parentId,
        platoonId: inspectorDraft.nodeType === "PLATOON" ? inspectorDraft.platoonId : undefined,
        sortOrder: getNextSortOrder(parentId),
      });
      return;
    }

    updateNodeMutation.mutate({
      nodeId: inspectorState.nodeId,
      payload: {
        key: inspectorDraft.key.trim(),
        name: inspectorDraft.name.trim(),
        nodeType: inspectorDraft.nodeType,
        parentId: inspectorDraft.nodeType === "ROOT" ? null : inspectorDraft.parentId || null,
        platoonId: inspectorDraft.nodeType === "PLATOON" ? inspectorDraft.platoonId || null : null,
      },
    });
  };

  const submitInlineEdit = () => {
    if (!inlineEditNodeId || !inlineEditDraft) return;

    if (!inlineEditDraft.key.trim() || !inlineEditDraft.name.trim()) {
      toast.error("Key and name are required.");
      return;
    }

    if (inlineEditDraft.nodeType !== "ROOT" && !inlineEditDraft.parentId) {
      toast.error("Parent node is required.");
      return;
    }

    if (inlineEditDraft.nodeType === "PLATOON" && !inlineEditDraft.platoonId) {
      toast.error("Platoon is required for platoon nodes.");
      return;
    }

    updateNodeMutation.mutate({
      nodeId: inlineEditNodeId,
      payload: {
        key: inlineEditDraft.key.trim(),
        name: inlineEditDraft.name.trim(),
        nodeType: inlineEditDraft.nodeType,
        parentId: inlineEditDraft.nodeType === "ROOT" ? null : inlineEditDraft.parentId || null,
        platoonId: inlineEditDraft.nodeType === "PLATOON" ? inlineEditDraft.platoonId || null : null,
      },
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    const node = nodeOptions.find((candidate) => candidate.id === nodeId);
    if (!node) return;
    if (!window.confirm(`Delete "${node.name}" from the hierarchy tree?`)) {
      return;
    }

    deleteNodeMutation.mutate(nodeId);
  };

  const handleDrop = (targetNodeId: string, position: HierarchyDropPosition) => {
    if (!draggingNodeId || draggingNodeId === targetNodeId) {
      setDraggingNodeId(null);
      return;
    }

    const payload = buildHierarchyReorderPayload(nodeOptions, {
      draggedNodeId: draggingNodeId,
      targetNodeId,
      position,
    });

    if (!payload) {
      setDraggingNodeId(null);
      toast.error("Invalid hierarchy move.");
      return;
    }

    reorderNodeMutation.mutate(payload);
  };

  return (
    <DashboardLayout
      title="Hierarchy Management"
      description="Manage the organization tree, commander-equivalent mapping, and platoon-linked authority structure."
    >
      <main className="space-y-6 p-6">
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "General Management", href: "/dashboard/genmgmt" },
            { label: "Hierarchy" },
          ]}
        />

        <SetupReturnBanner
          title="Setup step: Hierarchy"
          description="Link each platoon into the hierarchy tree, then return to the setup checklist."
        />

        <div className="grid gap-6 xl:grid-cols-[1.4fr,0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Organization Graph</CardTitle>
              <CardDescription>Linked hierarchy nodes with direct editing on each node card.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Network className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {selectedNode?.name ?? "Select a hierarchy node"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedNode
                        ? `${selectedNode.nodeType} • ${selectedNode.key}${selectedNode.platoonName ? ` • ${selectedNode.platoonName}` : ""}`
                        : "Create one ROOT node first, then link platoons below it."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!rootNode ? (
                    <Button
                      type="button"
                      onClick={openCreateRootInspector}
                      disabled={createNodeMutation.isPending}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Create Root Node
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openCreateInspector(selectedNode?.id ?? rootNode?.id ?? "", "GROUP")}
                    disabled={!selectedNode && !rootNode}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Child Group
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openCreateInspector(selectedNode?.id ?? rootNode?.id ?? "", "PLATOON")}
                    disabled={!selectedNode && !rootNode}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Child Platoon
                  </Button>
                  {selectedNode ? (
                    <Button type="button" onClick={() => openInlineEditor(selectedNode.id)}>
                      <SquarePen className="mr-1 h-4 w-4" />
                      Edit Selected
                    </Button>
                  ) : null}
                </div>
              </div>

              {hierarchyQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading hierarchy tree...</p>
              ) : tree.length === 0 ? (
                <div className="rounded-lg border border-dashed p-5">
                  <p className="text-sm font-medium">No hierarchy nodes found.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create the root node first. After that, add each active platoon below it.
                  </p>
                  <Button
                    type="button"
                    className="mt-4"
                    onClick={openCreateRootInspector}
                    disabled={createNodeMutation.isPending}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Create Root Node
                  </Button>
                </div>
              ) : (
                <HierarchyTree
                  tree={tree}
                  nodeOptions={nodeOptions}
                  platoonOptions={platoonOptions}
                  selectedNodeId={selectedNode?.id ?? null}
                  expandedNodeIds={new Set(expandedNodeIds)}
                  draggingNodeId={draggingNodeId}
                  deletePendingNodeId={deleteNodeMutation.isPending ? deleteNodeMutation.variables ?? null : null}
                  editingNodeId={inlineEditNodeId}
                  editingDraft={inlineEditDraft}
                  savingNodeId={updateNodeMutation.isPending ? updateNodeMutation.variables?.nodeId ?? null : null}
                  onSelectNode={setSelectedNodeId}
                  onToggleNode={(nodeId) =>
                    setExpandedNodeIds((current) =>
                      current.includes(nodeId)
                        ? current.filter((id) => id !== nodeId)
                        : [...current, nodeId]
                    )
                  }
                  onDragStart={setDraggingNodeId}
                  onDragEnd={() => setDraggingNodeId(null)}
                  onDrop={handleDrop}
                  onAddChild={openCreateInspector}
                  onEdit={openInlineEditor}
                  onEditDraftChange={setInlineEditDraft}
                  onSaveEdit={submitInlineEdit}
                  onCancelEdit={cancelInlineEditor}
                  onDelete={handleDeleteNode}
                />
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Selected Node</CardTitle>
                <CardDescription>
                  Review the current selection before editing or adding children in the hierarchy tree.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedNode ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{selectedNode.nodeType}</Badge>
                      {selectedNode.platoonName ? <Badge variant="secondary">{selectedNode.platoonName}</Badge> : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Name:</span> {selectedNode.name}
                      </p>
                      <p>
                        <span className="font-medium">Key:</span> {selectedNode.key}
                      </p>
                      <p>
                        <span className="font-medium">Parent:</span>{" "}
                        {nodeOptions.find((node) => node.id === selectedNode.parentId)?.name ?? "None"}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a node from the tree to inspect it.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Commander-Equivalent Mapping</CardTitle>
                <CardDescription>
                  Map the functional commander-equivalent authority to an explicit platoon-scoped position.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                  <div>
                    <span className="font-medium">Configured:</span>{" "}
                    {configuredMapping?.positionName ?? configuredMapping?.positionKey ?? "Unset"}
                  </div>
                  <div className="text-muted-foreground">
                    Effective: {effectiveMapping?.positionName ?? effectiveMapping?.positionKey ?? "Unset"}
                    {effectiveMapping?.source === "legacy_fallback" ? " (legacy fallback)" : ""}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Commander-Equivalent Position</Label>
                  <Select value={commanderPositionId} onValueChange={setCommanderPositionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a position" />
                    </SelectTrigger>
                    <SelectContent>
                      {commanderCandidates.map((position) => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.displayName ?? position.key} ({position.defaultScope})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => updateCommanderMutation.mutate(commanderPositionId || null)}
                    disabled={updateCommanderMutation.isPending || !commanderPositionId}
                  >
                    {updateCommanderMutation.isPending ? "Saving..." : "Save Mapping"}
                  </Button>
                  {isSuperAdmin ? (
                    <Button
                      variant="outline"
                      onClick={() => updateCommanderMutation.mutate(null)}
                      disabled={updateCommanderMutation.isPending}
                    >
                      Clear Mapping
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Sheet open={Boolean(inspectorState && inspectorDraft)} onOpenChange={(open) => !open && closeInspector()}>
          <SheetContent className="w-[92vw] sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{inspectorState?.mode === "edit" ? "Edit Hierarchy Node" : "Create Hierarchy Node"}</SheetTitle>
              <SheetDescription>
                {inspectorState?.mode === "edit"
                  ? "Update node details. Use drag-and-drop in the tree to change ordering."
                  : "Create a new hierarchy node under the selected parent."}
              </SheetDescription>
            </SheetHeader>

            {inspectorDraft ? (
              <div className="space-y-4 px-4">
                <div className="space-y-2">
                  <Label htmlFor="hierarchy-name">Name</Label>
                  <Input
                    id="hierarchy-name"
                    value={inspectorDraft.name}
                    onChange={(event) =>
                      setInspectorDraft((current) =>
                        current ? { ...current, name: event.target.value } : current
                      )
                    }
                    placeholder="Training Group Alpha"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hierarchy-key">Key</Label>
                  <Input
                    id="hierarchy-key"
                    value={inspectorDraft.key}
                    onChange={(event) =>
                      setInspectorDraft((current) =>
                        current ? { ...current, key: event.target.value } : current
                      )
                    }
                    placeholder="TRAINING_GROUP_ALPHA"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Node Type</Label>
                  <Select
                    value={inspectorDraft.nodeType}
                    onValueChange={(value: "ROOT" | "GROUP" | "PLATOON") =>
                      setInspectorDraft((current) =>
                        current
                          ? {
                              ...current,
                              nodeType:
                                inspectorState?.mode === "edit" && current.nodeType === "ROOT" ? "ROOT" : value,
                              platoonId: value === "PLATOON" ? current.platoonId : "",
                            }
                          : current
                      )
                    }
                    disabled={inspectorDraft.nodeType === "ROOT"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {inspectorDraft.nodeType === "ROOT" ? (
                        <SelectItem value="ROOT">ROOT</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="GROUP">GROUP</SelectItem>
                          <SelectItem value="PLATOON">PLATOON</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {inspectorDraft.nodeType !== "ROOT" ? (
                  <div className="space-y-2">
                    <Label>Parent Node</Label>
                    <Select
                      value={inspectorDraft.parentId}
                      onValueChange={(value) =>
                        setInspectorDraft((current) =>
                          current ? { ...current, parentId: value } : current
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent node" />
                      </SelectTrigger>
                      <SelectContent>
                        {parentOptions.map((node) => (
                          <SelectItem key={node.id} value={node.id}>
                            {node.name} ({node.nodeType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {inspectorDraft.nodeType === "PLATOON" ? (
                  <div className="space-y-2">
                    <Label>Platoon</Label>
                    <Select
                      value={inspectorDraft.platoonId}
                      onValueChange={(value) =>
                        setInspectorDraft((current) =>
                          current ? { ...current, platoonId: value } : current
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select platoon" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlatoonOptions.map((platoon) => (
                          <SelectItem key={platoon.id} value={platoon.id}>
                            {platoon.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            ) : null}

            <SheetFooter>
              <Button variant="outline" onClick={closeInspector} disabled={createNodeMutation.isPending || updateNodeMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={submitInspector} disabled={createNodeMutation.isPending || updateNodeMutation.isPending}>
                {inspectorState?.mode === "edit"
                  ? updateNodeMutation.isPending
                    ? "Saving..."
                    : "Save Changes"
                  : createNodeMutation.isPending
                    ? "Creating..."
                    : "Create Node"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </main>
    </DashboardLayout>
  );
}
