import { beforeEach, describe, expect, it, vi } from "vitest";

const queryQueue: unknown[] = [];

function createQueryChain() {
  return {
    innerJoin: vi.fn(() => createQueryChain()),
    where: vi.fn(async () => {
      const next = queryQueue.shift();
      if (next instanceof Error) {
        throw next;
      }

      return (next ?? []) as unknown[];
    }),
  };
}

vi.mock("@/app/db/client", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => createQueryChain()),
    })),
  },
}));

describe("getSetupStatus runtime fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    queryQueue.length = 0;
  });

  it("treats missing setup/auth columns as an incomplete setup instead of crashing", async () => {
    queryQueue.push(
      Object.assign(new Error('column "deleted_at" does not exist'), { code: "42703" }),
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [],
      []
    );

    const { getSetupStatus } = await import("@/app/lib/setup-status");
    const status = await getSetupStatus();

    expect(status.bootstrapRequired).toBe(true);
    expect(status.nextStep).toBe("superAdmin");
    expect(status.counts.activeSuperAdmins).toBe(0);
  });

  it("still rethrows unexpected database failures", async () => {
    queryQueue.push(
      Object.assign(new Error("connection lost"), { code: "57P01" }),
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [],
      []
    );

    const { getSetupStatus } = await import("@/app/lib/setup-status");

    await expect(getSetupStatus()).rejects.toMatchObject({ code: "57P01" });
  });
});
