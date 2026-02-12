import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as listCommanders, POST as createCommander } from "@/app/api/v1/admin/site-settings/commanders/route";
import {
  GET as getCommander,
  PUT as updateCommander,
  DELETE as deleteCommander,
} from "@/app/api/v1/admin/site-settings/commanders/[id]/route";
import { DELETE as hardDeleteCommander } from "@/app/api/v1/admin/site-settings/commanders/[id]/hard/route";
import { ApiError } from "@/app/lib/http";
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
  listSiteCommanders: vi.fn(async () => [
    {
      id: "commander-1",
      name: "Commander",
      imageUrl: null,
      imageObjectKey: null,
      tenure: "2025",
      description: "valid description",
      sortOrder: 1,
      isDeleted: false,
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
    },
  ]),
  createSiteCommander: vi.fn(async () => ({
    id: "commander-1",
    name: "Commander",
    imageUrl: null,
    imageObjectKey: null,
    tenure: "2025",
    description: "valid description",
    sortOrder: 1,
    isDeleted: false,
    deletedAt: null,
    createdAt: null,
    updatedAt: null,
  })),
  getSiteCommanderById: vi.fn(async () => ({
    id: "commander-1",
    name: "Commander",
    imageUrl: null,
    imageObjectKey: null,
    tenure: "2025",
    description: "valid description",
    sortOrder: 1,
    isDeleted: false,
    deletedAt: null,
    createdAt: null,
    updatedAt: null,
  })),
  updateSiteCommander: vi.fn(async () => ({
    before: {
      id: "commander-1",
      name: "Commander",
      imageUrl: null,
      imageObjectKey: null,
      tenure: "2025",
      description: "valid description",
      sortOrder: 1,
      isDeleted: false,
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
    },
    after: {
      id: "commander-1",
      name: "Commander 2",
      imageUrl: null,
      imageObjectKey: null,
      tenure: "2025",
      description: "valid description",
      sortOrder: 1,
      isDeleted: false,
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
    },
  })),
  softDeleteSiteCommander: vi.fn(async () => ({
    before: {
      id: "commander-1",
      imageObjectKey: null,
    },
    after: {
      id: "commander-1",
      isDeleted: true,
    },
  })),
  hardDeleteSiteCommander: vi.fn(async () => ({
    before: {
      id: "commander-1",
      imageObjectKey: null,
    },
    after: {
      id: "commander-1",
    },
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAdmin).mockResolvedValue({
    userId: "admin-1",
    roles: ["ADMIN"],
    claims: {},
  } as Awaited<ReturnType<typeof authz.requireAdmin>>);
});

describe("Admin site settings commanders routes", () => {
  it("returns 401 when auth fails", async () => {
    vi.mocked(authz.requireAdmin).mockRejectedValueOnce(
      new ApiError(401, "Unauthorized", "unauthorized")
    );

    const req = makeJsonRequest({ method: "GET", path: "/api/v1/admin/site-settings/commanders" });
    const res = await listCommanders(req as any, createRouteContext());

    expect(res.status).toBe(401);
  });

  it("lists commanders", async () => {
    const req = makeJsonRequest({ method: "GET", path: "/api/v1/admin/site-settings/commanders" });
    const res = await listCommanders(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(siteQueries.listSiteCommanders).toHaveBeenCalledTimes(1);
  });

  it("creates commander", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/admin/site-settings/commanders",
      body: { name: "Commander", tenure: "2025", description: "valid description" },
    });

    const res = await createCommander(req as any, createRouteContext());
    expect(res.status).toBe(201);
  });

  it("gets a commander by id", async () => {
    const req = makeJsonRequest({ method: "GET", path: "/api/v1/admin/site-settings/commanders/commander-1" });
    const res = await getCommander(req as any, createRouteContext({ id: "c36ff29c-d6cc-4df5-963e-b17d46f1ea67" }));
    expect(res.status).toBe(200);
  });

  it("updates commander", async () => {
    const req = makeJsonRequest({
      method: "PUT",
      path: "/api/v1/admin/site-settings/commanders/commander-1",
      body: { name: "Commander 2" },
    });

    const res = await updateCommander(
      req as any,
      createRouteContext({ id: "c36ff29c-d6cc-4df5-963e-b17d46f1ea67" })
    );

    expect(res.status).toBe(200);
  });

  it("soft deletes commander", async () => {
    const req = makeJsonRequest({ method: "DELETE", path: "/api/v1/admin/site-settings/commanders/commander-1" });
    const res = await deleteCommander(
      req as any,
      createRouteContext({ id: "c36ff29c-d6cc-4df5-963e-b17d46f1ea67" })
    );

    expect(res.status).toBe(200);
  });

  it("hard deletes commander", async () => {
    const req = makeJsonRequest({ method: "DELETE", path: "/api/v1/admin/site-settings/commanders/commander-1/hard" });
    const res = await hardDeleteCommander(
      req as any,
      createRouteContext({ id: "c36ff29c-d6cc-4df5-963e-b17d46f1ea67" })
    );

    expect(res.status).toBe(200);
  });
});
