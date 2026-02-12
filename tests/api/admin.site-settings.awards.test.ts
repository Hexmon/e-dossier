import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as listAwards, POST as createAward } from "@/app/api/v1/admin/site-settings/awards/route";
import {
  GET as getAward,
  PUT as updateAward,
  DELETE as deleteAward,
} from "@/app/api/v1/admin/site-settings/awards/[id]/route";
import { DELETE as hardDeleteAward } from "@/app/api/v1/admin/site-settings/awards/[id]/hard/route";
import { PATCH as reorderAwards } from "@/app/api/v1/admin/site-settings/awards/reorder/route";
import { makeJsonRequest, createRouteContext } from "../utils/next";

import * as authz from "@/app/lib/authz";
import * as siteQueries from "@/app/db/queries/site-settings";

vi.mock("@/app/lib/authz", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/lib/storage", () => ({
  deleteObject: vi.fn(async () => undefined),
}));

vi.mock("@/app/db/queries/site-settings", () => ({
  listSiteAwards: vi.fn(async () => [
    {
      id: "f4f23f49-334d-435a-9c54-e4383a9088bd",
      title: "Award",
      description: "valid description",
      imageUrl: null,
      imageObjectKey: null,
      category: "Cat",
      sortOrder: 1,
      isDeleted: false,
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
    },
  ]),
  createSiteAward: vi.fn(async () => ({
    id: "f4f23f49-334d-435a-9c54-e4383a9088bd",
    title: "Award",
    description: "valid description",
    imageUrl: null,
    imageObjectKey: null,
    category: "Cat",
    sortOrder: 1,
    isDeleted: false,
    deletedAt: null,
    createdAt: null,
    updatedAt: null,
  })),
  getSiteAwardById: vi.fn(async () => ({
    id: "f4f23f49-334d-435a-9c54-e4383a9088bd",
    title: "Award",
    description: "valid description",
    imageUrl: null,
    imageObjectKey: null,
    category: "Cat",
    sortOrder: 1,
    isDeleted: false,
    deletedAt: null,
    createdAt: null,
    updatedAt: null,
  })),
  updateSiteAward: vi.fn(async () => ({
    before: {
      id: "f4f23f49-334d-435a-9c54-e4383a9088bd",
      title: "Award",
      description: "valid description",
      imageUrl: null,
      imageObjectKey: null,
      category: "Cat",
      sortOrder: 1,
      isDeleted: false,
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
    },
    after: {
      id: "f4f23f49-334d-435a-9c54-e4383a9088bd",
      title: "Award 2",
      description: "valid description",
      imageUrl: null,
      imageObjectKey: null,
      category: "Cat",
      sortOrder: 1,
      isDeleted: false,
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
    },
  })),
  softDeleteSiteAward: vi.fn(async () => ({ before: { id: "id" }, after: { id: "id", isDeleted: true } })),
  hardDeleteSiteAward: vi.fn(async () => ({ before: { id: "id", imageObjectKey: null }, after: { id: "id" } })),
  reorderSiteAwards: vi.fn(async () => ({ ok: true, items: [] })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAdmin).mockResolvedValue({
    userId: "admin-1",
    roles: ["ADMIN"],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAdmin>>);
});

describe("Admin site settings awards routes", () => {
  const uuid = "f4f23f49-334d-435a-9c54-e4383a9088bd";

  it("lists awards", async () => {
    const req = makeJsonRequest({ method: "GET", path: "/api/v1/admin/site-settings/awards" });
    const res = await listAwards(req as any, createRouteContext());

    expect(res.status).toBe(200);
  });

  it("creates award", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/admin/site-settings/awards",
      body: { title: "Award", description: "valid description", category: "Cat" },
    });
    const res = await createAward(req as any, createRouteContext());
    expect(res.status).toBe(201);
  });

  it("gets, updates and soft deletes award", async () => {
    const getReq = makeJsonRequest({ method: "GET", path: `/api/v1/admin/site-settings/awards/${uuid}` });
    const getRes = await getAward(getReq as any, createRouteContext({ id: uuid }));
    expect(getRes.status).toBe(200);

    const putReq = makeJsonRequest({
      method: "PUT",
      path: `/api/v1/admin/site-settings/awards/${uuid}`,
      body: { title: "Award 2" },
    });
    const putRes = await updateAward(putReq as any, createRouteContext({ id: uuid }));
    expect(putRes.status).toBe(200);

    const delReq = makeJsonRequest({ method: "DELETE", path: `/api/v1/admin/site-settings/awards/${uuid}` });
    const delRes = await deleteAward(delReq as any, createRouteContext({ id: uuid }));
    expect(delRes.status).toBe(200);
  });

  it("hard deletes award", async () => {
    const req = makeJsonRequest({ method: "DELETE", path: `/api/v1/admin/site-settings/awards/${uuid}/hard` });
    const res = await hardDeleteAward(req as any, createRouteContext({ id: uuid }));

    expect(res.status).toBe(200);
  });

  it("reorders awards", async () => {
    const req = makeJsonRequest({
      method: "PATCH",
      path: "/api/v1/admin/site-settings/awards/reorder",
      body: { orderedIds: [uuid] },
    });

    const res = await reorderAwards(req as any, createRouteContext());

    expect(res.status).toBe(200);
    expect(siteQueries.reorderSiteAwards).toHaveBeenCalledWith([uuid]);
  });

  it("rejects reorder duplicates", async () => {
    const req = makeJsonRequest({
      method: "PATCH",
      path: "/api/v1/admin/site-settings/awards/reorder",
      body: { orderedIds: [uuid, uuid] },
    });

    const res = await reorderAwards(req as any, createRouteContext());
    expect(res.status).toBe(400);
  });
});
