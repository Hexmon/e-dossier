import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

export type HierarchyNodeRecord = {
  id: string;
  key: string;
  name: string;
  nodeType: "ROOT" | "GROUP" | "PLATOON";
  parentId: string | null;
  platoonId: string | null;
  sortOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  platoonKey?: string | null;
  platoonName?: string | null;
};

export type HierarchyNodeInput = {
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

type HierarchyNodesResponse = {
  message: string;
  items: HierarchyNodeRecord[];
};

type HierarchyNodeResponse = {
  message: string;
  item: HierarchyNodeRecord;
};

type FunctionalRoleMappingsResponse = {
  message: string;
  configured: {
    id: string;
    capabilityKey: string;
    positionId: string | null;
    positionKey: string | null;
    positionName: string | null;
    defaultScope: string | null;
    source: "mapping" | "legacy_fallback";
  } | null;
  effective: {
    id: string;
    capabilityKey: string;
    positionId: string | null;
    positionKey: string | null;
    positionName: string | null;
    defaultScope: string | null;
    source: "mapping" | "legacy_fallback";
  } | null;
};

type FunctionalRoleMappingUpdateResponse = {
  message: string;
  mapping: {
    id: string;
    capabilityKey: string;
    positionId: string | null;
  };
};

export const hierarchyAdminApi = {
  listNodes: async () => {
    return api.get<HierarchyNodesResponse>(endpoints.admin.hierarchy.nodes, { baseURL });
  },
  createNode: async (body: HierarchyNodeInput) => {
    return api.post<HierarchyNodeResponse>(endpoints.admin.hierarchy.nodes, body, { baseURL });
  },
  updateNode: async (id: string, body: Partial<HierarchyNodeInput>) => {
    return api.patch<HierarchyNodeResponse>(endpoints.admin.hierarchy.nodeById(id), body, { baseURL });
  },
  reorderNodes: async (items: HierarchyNodeReorderItem[]) => {
    return api.patch<HierarchyNodesResponse, { items: HierarchyNodeReorderItem[] }>(
      `${endpoints.admin.hierarchy.nodes}/reorder`,
      { items },
      { baseURL }
    );
  },
  deleteNode: async (id: string) => {
    return api.delete<HierarchyNodeResponse>(endpoints.admin.hierarchy.nodeById(id), { baseURL });
  },
  getFunctionalRoleMappings: async () => {
    return api.get<FunctionalRoleMappingsResponse>(endpoints.admin.hierarchy.functionalRoleMappings, {
      baseURL,
    });
  },
  updateCommanderEquivalentMapping: async (commanderEquivalentPositionId: string | null) => {
    return api.put<FunctionalRoleMappingUpdateResponse>(
      endpoints.admin.hierarchy.functionalRoleMappings,
      { commanderEquivalentPositionId },
      { baseURL }
    );
  },
};
