import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as listHistory, POST as createHistory } from "@/app/api/v1/admin/site-settings/history/route";
import {
  GET as getHistory,
  PUT as updateHistory,
  DELETE as deleteHistory,
} from "@/app/api/v1/admin/site-settings/history/[id]/route";
import { DELETE as hardDeleteHistory } from "@/app/api/v1/admin/site-settings/history/[id]/hard/route";
import { makeJsonRequest, createRouteContext } from "../utils/next";

import * as authz from "@/app/lib/authz";

vi.mock("@/app/lib/authz", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/db/queries/site-settings", () => ({
  listSiteHistory: vi.fn(async () => [
    {
      id: "efff9dd0-f8f8-4cf7-962e-2ede2583a5b4",
      yearOrDate: "1943",
      description: "Created",
      isDeleted: false,
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
    },
  ]),
  createSiteHistory: vi.fn(async () => ({
    id: "efff9dd0-f8f8-4cf7-962e-2ede2583a5b4",
    yearOrDate: "1943",
    description: "Created",
    isDeleted: false,
    deletedAt: null,
    createdAt: null,
    updatedAt: null,
  })),
  getSiteHistoryById: vi.fn(async () => ({
    id: "efff9dd0-f8f8-4cf7-962e-2ede2583a5b4",
    yearOrDate: "1943",
    description: "Created",
    isDeleted: false,
    deletedAt: null,
    createdAt: null,
    updatedAt: null,
  })),
  updateSiteHistory: vi.fn(async () => ({
    before: {
      id: "efff9dd0-f8f8-4cf7-962e-2ede2583a5b4",
      yearOrDate: "1943",
      description: "Created",
      isDeleted: false,
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
    },
    after: {
      id: "efff9dd0-f8f8-4cf7-962e-2ede2583a5b4",
      yearOrDate: "1944",
      description: "Created",
      isDeleted: false,
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
    },
  })),
  softDeleteSiteHistory: vi.fn(async () => ({ before: { id: "id" }, after: { id: "id", isDeleted: true } })),
  hardDeleteSiteHistory: vi.fn(async () => ({ before: { id: "id" }, after: { id: "id" } })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAdmin).mockResolvedValue({
    userId: "admin-1",
    roles: ["ADMIN"],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAdmin>>);
});

describe("Admin site settings history routes", () => {
  const uuid = "efff9dd0-f8f8-4cf7-962e-2ede2583a5b4";

  it("lists history with sort query", async () => {
    const req = makeJsonRequest({ method: "GET", path: "/api/v1/admin/site-settings/history?sort=desc" });
    const res = await listHistory(req as any, createRouteContext());
    expect(res.status).toBe(200);
  });

  it("creates history", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/admin/site-settings/history",
      body: { yearOrDate: "1943", description: "Created" },
    });
    const res = await createHistory(req as any, createRouteContext());
    expect(res.status).toBe(201);
  });

  it("gets, updates and soft deletes history", async () => {
    const getReq = makeJsonRequest({ method: "GET", path: `/api/v1/admin/site-settings/history/${uuid}` });
    const getRes = await getHistory(getReq as any, createRouteContext({ id: uuid }));
    expect(getRes.status).toBe(200);

    const putReq = makeJsonRequest({
      method: "PUT",
      path: `/api/v1/admin/site-settings/history/${uuid}`,
      body: { yearOrDate: "1944" },
    });
    const putRes = await updateHistory(putReq as any, createRouteContext({ id: uuid }));
    expect(putRes.status).toBe(200);

    const delReq = makeJsonRequest({ method: "DELETE", path: `/api/v1/admin/site-settings/history/${uuid}` });
    const delRes = await deleteHistory(delReq as any, createRouteContext({ id: uuid }));
    expect(delRes.status).toBe(200);
  });

  it("hard deletes history", async () => {
    const req = makeJsonRequest({ method: "DELETE", path: `/api/v1/admin/site-settings/history/${uuid}/hard` });
    const res = await hardDeleteHistory(req as any, createRouteContext({ id: uuid }));
    expect(res.status).toBe(200);
  });
});
