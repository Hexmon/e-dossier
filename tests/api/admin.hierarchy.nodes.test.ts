import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getNodes, POST as createNode } from "@/app/api/v1/admin/hierarchy/nodes/route";
import {
  PATCH as updateNode,
  DELETE as deleteNode,
} from "@/app/api/v1/admin/hierarchy/nodes/[id]/route";
import { ApiError } from "@/app/lib/http";
import { createRouteContext, makeJsonRequest } from "../utils/next";

const auditLogMock = vi.fn(async () => undefined);

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => (req: any, context: any) => {
    req.audit = { log: auditLogMock };
    return handler(req, context);
  },
  AuditEventType: {
    API_REQUEST: "api.request",
  },
  AuditResourceType: {
    API: "api",
  },
}));

vi.mock("@/app/lib/authz", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/db/queries/hierarchy", () => ({
  listHierarchyNodes: vi.fn(),
  createHierarchyNode: vi.fn(),
  updateHierarchyNode: vi.fn(),
  deleteHierarchyNode: vi.fn(),
}));

import { requireAdmin } from "@/app/lib/authz";
import {
  createHierarchyNode,
  deleteHierarchyNode,
  listHierarchyNodes,
  updateHierarchyNode,
} from "@/app/db/queries/hierarchy";

const nodeId = "11111111-1111-4111-8111-111111111111";

describe("admin hierarchy node routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as any).mockResolvedValue({
      userId: "admin-1",
      roles: ["ADMIN"],
      claims: { apt: { position: "ADMIN" } },
    });
  });

  it("GET returns hierarchy nodes for an admin", async () => {
    (listHierarchyNodes as any).mockResolvedValueOnce([
      {
        id: nodeId,
        key: "ROOT",
        name: "Organization Root",
        nodeType: "ROOT",
      },
    ]);

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/hierarchy/nodes",
    });
    const res = await getNodes(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].key).toBe("ROOT");
  });

  it("POST validates input before creating a hierarchy node", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/admin/hierarchy/nodes",
      body: { key: "", name: "" },
    });
    const res = await createNode(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe("Validation failed.");
    expect(createHierarchyNode).not.toHaveBeenCalled();
  });

  it("POST creates a hierarchy node for an admin", async () => {
    (createHierarchyNode as any).mockResolvedValueOnce({
      id: nodeId,
      key: "GROUP_ALPHA",
      name: "Group Alpha",
      nodeType: "GROUP",
      parentId: "22222222-2222-4222-8222-222222222222",
      platoonId: null,
      sortOrder: 3,
    });

    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/admin/hierarchy/nodes",
      body: {
        key: "GROUP_ALPHA",
        name: "Group Alpha",
        nodeType: "GROUP",
        parentId: "22222222-2222-4222-8222-222222222222",
        sortOrder: 3,
      },
    });
    const res = await createNode(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.item.name).toBe("Group Alpha");
    expect(createHierarchyNode).toHaveBeenCalledWith(
      {
        key: "GROUP_ALPHA",
        name: "Group Alpha",
        nodeType: "GROUP",
        parentId: "22222222-2222-4222-8222-222222222222",
        sortOrder: 3,
      },
      "admin-1"
    );
  });

  it("PATCH updates a hierarchy node", async () => {
    (updateHierarchyNode as any).mockResolvedValueOnce({
      id: nodeId,
      key: "GROUP_BRAVO",
      name: "Group Bravo",
      nodeType: "GROUP",
      parentId: "22222222-2222-4222-8222-222222222222",
      platoonId: null,
      sortOrder: 4,
    });

    const req = makeJsonRequest({
      method: "PATCH",
      path: `/api/v1/admin/hierarchy/nodes/${nodeId}`,
      body: {
        name: "Group Bravo",
        sortOrder: 4,
      },
    });
    const res = await updateNode(req as any, createRouteContext({ id: nodeId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.item.name).toBe("Group Bravo");
    expect(updateHierarchyNode).toHaveBeenCalledWith(
      nodeId,
      {
        name: "Group Bravo",
        sortOrder: 4,
      },
      "admin-1"
    );
  });

  it("DELETE soft-deletes a hierarchy node", async () => {
    (deleteHierarchyNode as any).mockResolvedValueOnce({
      id: nodeId,
      deletedAt: "2026-04-04T00:00:00.000Z",
    });

    const req = makeJsonRequest({
      method: "DELETE",
      path: `/api/v1/admin/hierarchy/nodes/${nodeId}`,
    });
    const res = await deleteNode(req as any, createRouteContext({ id: nodeId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.item.id).toBe(nodeId);
    expect(deleteHierarchyNode).toHaveBeenCalledWith(nodeId, "admin-1");
  });

  it("returns 403 when admin auth fails", async () => {
    (requireAdmin as any).mockRejectedValueOnce(
      new ApiError(403, "Admin privileges required", "forbidden")
    );

    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/hierarchy/nodes",
    });
    const res = await getNodes(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });
});
