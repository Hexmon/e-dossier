import { describe, expect, it, vi } from "vitest";

const mockListPermissions = vi.hoisted(() => vi.fn());

vi.mock("@/app/lib/api/rbacApi", () => ({
  rbacApi: {
    listPermissions: mockListPermissions,
  },
}));

import { fetchAllRbacPermissions } from "@/hooks/useRbacPermissions";

describe("fetchAllRbacPermissions", () => {
  it("loads every permission page beyond the first 500 actions", async () => {
    mockListPermissions
      .mockResolvedValueOnce({
        items: Array.from({ length: 500 }, (_, index) => ({
          id: `perm-${index}`,
          key: `admin:test:${index}`,
          description: null,
        })),
        total: 560,
        limit: 500,
        offset: 0,
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: Array.from({ length: 60 }, (_, index) => ({
          id: `perm-${500 + index}`,
          key: `admin:test:${500 + index}`,
          description: null,
        })),
        total: 560,
        limit: 500,
        offset: 500,
        hasMore: false,
      });

    const result = await fetchAllRbacPermissions();

    expect(result.loadedCount).toBe(560);
    expect(result.total).toBe(560);
    expect(result.items).toHaveLength(560);
    expect(mockListPermissions).toHaveBeenNthCalledWith(1, { limit: 500, offset: 0 });
    expect(mockListPermissions).toHaveBeenNthCalledWith(2, { limit: 500, offset: 500 });
  });
});
