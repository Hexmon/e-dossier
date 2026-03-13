import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GET as listEventsNews,
  POST as createEventNews,
} from "@/app/api/v1/admin/site-settings/events-news/route";
import {
  GET as getEventNews,
  PUT as updateEventNews,
  DELETE as deleteEventNews,
} from "@/app/api/v1/admin/site-settings/events-news/[id]/route";
import { DELETE as hardDeleteEventNews } from "@/app/api/v1/admin/site-settings/events-news/[id]/hard/route";
import { makeJsonRequest, createRouteContext } from "../utils/next";

import * as authz from "@/app/lib/authz";
import * as siteQueries from "@/app/db/queries/site-settings";

vi.mock("@/app/lib/authz", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/db/queries/site-settings", () => ({
  listSiteEventsNews: vi.fn(async () => [
    {
      id: "1b1d4d12-7a63-4ac7-8047-67a5a7b2aa56",
      date: "2025-01-01",
      title: "Item",
      description: "valid description",
      location: "Main Hall",
      type: "event",
      isDeleted: false,
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
    },
  ]),
  createSiteEventNews: vi.fn(async () => ({
    id: "1b1d4d12-7a63-4ac7-8047-67a5a7b2aa56",
    date: "2025-01-01",
    title: "Item",
    description: "valid description",
    location: "Main Hall",
    type: "event",
    isDeleted: false,
    deletedAt: null,
    createdAt: null,
    updatedAt: null,
  })),
  getSiteEventNewsById: vi.fn(async () => ({
    id: "1b1d4d12-7a63-4ac7-8047-67a5a7b2aa56",
    date: "2025-01-01",
    title: "Item",
    description: "valid description",
    location: "Main Hall",
    type: "event",
    isDeleted: false,
    deletedAt: null,
    createdAt: null,
    updatedAt: null,
  })),
  updateSiteEventNews: vi.fn(async () => ({
    before: {
      id: "1b1d4d12-7a63-4ac7-8047-67a5a7b2aa56",
      date: "2025-01-01",
      title: "Item",
      description: "valid description",
      location: "Main Hall",
      type: "event",
      isDeleted: false,
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
    },
    after: {
      id: "1b1d4d12-7a63-4ac7-8047-67a5a7b2aa56",
      date: "2025-01-02",
      title: "Item Updated",
      description: "valid description",
      location: "Main Hall",
      type: "news",
      isDeleted: false,
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
    },
  })),
  softDeleteSiteEventNews: vi.fn(async () => ({ before: { id: "id" }, after: { id: "id", isDeleted: true } })),
  hardDeleteSiteEventNews: vi.fn(async () => ({ before: { id: "id" }, after: { id: "id" } })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAdmin).mockResolvedValue({
    userId: "admin-1",
    roles: ["ADMIN"],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAdmin>>);
});

describe("Admin site settings events/news routes", () => {
  const uuid = "1b1d4d12-7a63-4ac7-8047-67a5a7b2aa56";

  it("lists events/news with filters", async () => {
    const req = makeJsonRequest({
      method: "GET",
      path: "/api/v1/admin/site-settings/events-news?sort=desc&type=event",
    });
    const res = await listEventsNews(req as any, createRouteContext());

    expect(res.status).toBe(200);
    expect(siteQueries.listSiteEventsNews).toHaveBeenCalledWith({ sort: "desc", type: "event" });
  });

  it("creates an event/news item", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/admin/site-settings/events-news",
      body: {
        date: "2025-01-01",
        title: "Item",
        description: "valid description",
        location: "Main Hall",
        type: "event",
      },
    });
    const res = await createEventNews(req as any, createRouteContext());
    expect(res.status).toBe(201);
  });

  it("gets, updates and soft deletes an item", async () => {
    const getReq = makeJsonRequest({ method: "GET", path: `/api/v1/admin/site-settings/events-news/${uuid}` });
    const getRes = await getEventNews(getReq as any, createRouteContext({ id: uuid }));
    expect(getRes.status).toBe(200);

    const putReq = makeJsonRequest({
      method: "PUT",
      path: `/api/v1/admin/site-settings/events-news/${uuid}`,
      body: { title: "Item Updated", type: "news" },
    });
    const putRes = await updateEventNews(putReq as any, createRouteContext({ id: uuid }));
    expect(putRes.status).toBe(200);

    const delReq = makeJsonRequest({ method: "DELETE", path: `/api/v1/admin/site-settings/events-news/${uuid}` });
    const delRes = await deleteEventNews(delReq as any, createRouteContext({ id: uuid }));
    expect(delRes.status).toBe(200);
  });

  it("hard deletes an item", async () => {
    const req = makeJsonRequest({
      method: "DELETE",
      path: `/api/v1/admin/site-settings/events-news/${uuid}/hard`,
    });
    const res = await hardDeleteEventNews(req as any, createRouteContext({ id: uuid }));
    expect(res.status).toBe(200);
  });
});
