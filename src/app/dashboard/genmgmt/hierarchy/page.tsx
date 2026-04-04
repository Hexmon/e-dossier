"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hierarchyAdminApi, type HierarchyNodeInput } from "@/app/lib/api/hierarchyAdminApi";
import { getPlatoons } from "@/app/lib/api/platoonApi";
import { getPositions } from "@/app/lib/api/appointmentApi";
import { useMe } from "@/hooks/useMe";

type HierarchyDraft = {
  key: string;
  name: string;
  nodeType: "GROUP" | "PLATOON";
  parentId: string;
  platoonId: string;
  sortOrder: string;
};

const EMPTY_DRAFT: HierarchyDraft = {
  key: "",
  name: "",
  nodeType: "GROUP",
  parentId: "",
  platoonId: "",
  sortOrder: "0",
};

type HierarchyEditDraft = {
  key: string;
  name: string;
  nodeType: "ROOT" | "GROUP" | "PLATOON";
  parentId: string;
  platoonId: string;
  sortOrder: string;
};

export default function HierarchyManagementPage() {
  const queryClient = useQueryClient();
  const { data: meData } = useMe();
  const [draft, setDraft] = useState<HierarchyDraft>(EMPTY_DRAFT);
  const [commanderPositionId, setCommanderPositionId] = useState<string>("");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<HierarchyEditDraft | null>(null);

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

  const nodeOptions = hierarchyQuery.data?.items ?? [];
  const platoonOptions = platoonsQuery.data ?? [];
  const positions = positionsQuery.data ?? [];
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

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["hierarchy-nodes"] }),
      queryClient.invalidateQueries({ queryKey: ["hierarchy-functional-role-mapping"] }),
      queryClient.invalidateQueries({ queryKey: ["navigation", "me"] }),
      queryClient.invalidateQueries({ queryKey: ["me"] }),
    ]);
  };

  const createNodeMutation = useMutation({
    mutationFn: async () => {
      const payload: HierarchyNodeInput = {
        key: draft.key,
        name: draft.name,
        nodeType: draft.nodeType,
        parentId: draft.parentId || undefined,
        platoonId: draft.nodeType === "PLATOON" ? draft.platoonId || undefined : undefined,
        sortOrder: Number(draft.sortOrder || 0),
      };
      return hierarchyAdminApi.createNode(payload);
    },
    onSuccess: async () => {
      toast.success("Hierarchy node created.");
      setDraft(EMPTY_DRAFT);
      await refresh();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to create hierarchy node.");
    },
  });

  const updateCommanderMutation = useMutation({
    mutationFn: async (nextPositionId: string | null) => {
      return hierarchyAdminApi.updateCommanderEquivalentMapping(nextPositionId);
    },
    onSuccess: async () => {
      toast.success("Commander-equivalent mapping updated.");
      await refresh();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to update functional mapping.");
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: string) => hierarchyAdminApi.deleteNode(nodeId),
    onSuccess: async () => {
      toast.success("Hierarchy node deleted.");
      await refresh();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete hierarchy node.");
    },
  });

  const updateNodeMutation = useMutation({
    mutationFn: async ({ nodeId, payload }: { nodeId: string; payload: Partial<HierarchyNodeInput> }) =>
      hierarchyAdminApi.updateNode(nodeId, payload),
    onSuccess: async () => {
      toast.success("Hierarchy node updated.");
      setEditingNodeId(null);
      setEditDraft(null);
      await refresh();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to update hierarchy node.");
    },
  });

  const effectiveMapping = mappingQuery.data?.effective ?? null;
  const configuredMapping = mappingQuery.data?.configured ?? null;

  const startEditingNode = (node: (typeof nodeOptions)[number]) => {
    setEditingNodeId(node.id);
    setEditDraft({
      key: node.key,
      name: node.name,
      nodeType: node.nodeType,
      parentId: node.parentId ?? "",
      platoonId: node.platoonId ?? "",
      sortOrder: String(node.sortOrder ?? 0),
    });
  };

  const submitNodeEdit = () => {
    if (!editingNodeId || !editDraft) return;

    const payload: Partial<HierarchyNodeInput> = {
      key: editDraft.key,
      name: editDraft.name,
      nodeType: editDraft.nodeType,
      sortOrder: Number(editDraft.sortOrder || 0),
    };

    if (editDraft.nodeType !== "ROOT") {
      payload.parentId = editDraft.parentId || null;
    }

    payload.platoonId = editDraft.nodeType === "PLATOON" ? editDraft.platoonId || null : null;

    updateNodeMutation.mutate({ nodeId: editingNodeId, payload });
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

        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Organization Tree</CardTitle>
              <CardDescription>
                Create structural nodes and link platoons into the live hierarchy. ROOT is seeded automatically and cannot be removed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hierarchy-key">Key</Label>
                  <Input
                    id="hierarchy-key"
                    value={draft.key}
                    onChange={(event) => setDraft((current) => ({ ...current, key: event.target.value }))}
                    placeholder="e.g. TRAINING_GROUP_ALPHA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hierarchy-name">Name</Label>
                  <Input
                    id="hierarchy-name"
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Training Group Alpha"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Node Type</Label>
                  <Select
                    value={draft.nodeType}
                    onValueChange={(value: "GROUP" | "PLATOON") =>
                      setDraft((current) => ({ ...current, nodeType: value, platoonId: value === "PLATOON" ? current.platoonId : "" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GROUP">GROUP</SelectItem>
                      <SelectItem value="PLATOON">PLATOON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Parent Node</Label>
                  <Select
                    value={draft.parentId}
                    onValueChange={(value) => setDraft((current) => ({ ...current, parentId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent node" />
                    </SelectTrigger>
                    <SelectContent>
                      {nodeOptions.map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          {node.name} ({node.nodeType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {draft.nodeType === "PLATOON" ? (
                  <div className="space-y-2">
                    <Label>Platoon</Label>
                    <Select
                      value={draft.platoonId}
                      onValueChange={(value) => setDraft((current) => ({ ...current, platoonId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select platoon" />
                      </SelectTrigger>
                      <SelectContent>
                        {platoonOptions.map((platoon) => (
                          <SelectItem key={platoon.id} value={platoon.id}>
                            {platoon.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="hierarchy-sort-order">Sort Order</Label>
                  <Input
                    id="hierarchy-sort-order"
                    type="number"
                    value={draft.sortOrder}
                    onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => createNodeMutation.mutate()} disabled={createNodeMutation.isPending}>
                  {createNodeMutation.isPending ? "Creating..." : "Add Node"}
                </Button>
              </div>

              <div className="space-y-3">
                {hierarchyQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading hierarchy nodes...</p>
                ) : nodeOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hierarchy nodes found.</p>
                ) : (
                  nodeOptions.map((node) => (
                    <div key={node.id} className="space-y-4 rounded-lg border p-4">
                      {editingNodeId === node.id && editDraft ? (
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`hierarchy-edit-key-${node.id}`}>Key</Label>
                              <Input
                                id={`hierarchy-edit-key-${node.id}`}
                                value={editDraft.key}
                                onChange={(event) =>
                                  setEditDraft((current) =>
                                    current ? { ...current, key: event.target.value } : current
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`hierarchy-edit-name-${node.id}`}>Name</Label>
                              <Input
                                id={`hierarchy-edit-name-${node.id}`}
                                value={editDraft.name}
                                onChange={(event) =>
                                  setEditDraft((current) =>
                                    current ? { ...current, name: event.target.value } : current
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Node Type</Label>
                              <Select
                                value={editDraft.nodeType}
                                onValueChange={(value: "ROOT" | "GROUP" | "PLATOON") =>
                                  setEditDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          nodeType: node.nodeType === "ROOT" ? "ROOT" : value,
                                          platoonId:
                                            (node.nodeType === "ROOT" ? "ROOT" : value) === "PLATOON"
                                              ? current.platoonId
                                              : "",
                                        }
                                      : current
                                  )
                                }
                                disabled={node.nodeType === "ROOT"}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {node.nodeType === "ROOT" ? (
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
                            {editDraft.nodeType !== "ROOT" ? (
                              <div className="space-y-2">
                                <Label>Parent Node</Label>
                                <Select
                                  value={editDraft.parentId}
                                  onValueChange={(value) =>
                                    setEditDraft((current) =>
                                      current ? { ...current, parentId: value } : current
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select parent node" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {nodeOptions
                                      .filter((candidate) => candidate.id !== node.id)
                                      .map((candidate) => (
                                        <SelectItem key={candidate.id} value={candidate.id}>
                                          {candidate.name} ({candidate.nodeType})
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : null}
                            {editDraft.nodeType === "PLATOON" ? (
                              <div className="space-y-2">
                                <Label>Platoon</Label>
                                <Select
                                  value={editDraft.platoonId}
                                  onValueChange={(value) =>
                                    setEditDraft((current) =>
                                      current ? { ...current, platoonId: value } : current
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select platoon" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {platoonOptions.map((platoon) => (
                                      <SelectItem key={platoon.id} value={platoon.id}>
                                        {platoon.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : null}
                            <div className="space-y-2">
                              <Label htmlFor={`hierarchy-edit-sort-${node.id}`}>Sort Order</Label>
                              <Input
                                id={`hierarchy-edit-sort-${node.id}`}
                                type="number"
                                value={editDraft.sortOrder}
                                onChange={(event) =>
                                  setEditDraft((current) =>
                                    current ? { ...current, sortOrder: event.target.value } : current
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingNodeId(null);
                                setEditDraft(null);
                              }}
                              disabled={updateNodeMutation.isPending}
                            >
                              Cancel
                            </Button>
                            <Button onClick={submitNodeEdit} disabled={updateNodeMutation.isPending}>
                              {updateNodeMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">
                              {node.name} <span className="text-muted-foreground">({node.nodeType})</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Key: {node.key}
                              {node.parentId
                                ? ` • Parent: ${nodeOptions.find((candidate) => candidate.id === node.parentId)?.name ?? node.parentId}`
                                : ""}
                              {node.platoonName ? ` • Platoon: ${node.platoonName}` : ""}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => startEditingNode(node)}>
                              Edit
                            </Button>
                            {node.nodeType !== "ROOT" ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteNodeMutation.mutate(node.id)}
                                disabled={deleteNodeMutation.isPending}
                              >
                                Delete
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Commander-Equivalent Mapping</CardTitle>
              <CardDescription>
                Map the functional commander-equivalent authority to an explicit platoon-scoped position. The display name remains user-facing and can be renamed separately.
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
      </main>
    </DashboardLayout>
  );
}
