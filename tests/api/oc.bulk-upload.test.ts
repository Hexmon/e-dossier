import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as bulkUploadOc } from "@/app/api/v1/oc/bulk-upload/route";
import { db } from "@/app/db/client";
import * as ocChecks from "@/app/api/v1/oc/_checks";
import * as ocLifecycle from "@/app/db/queries/oc-lifecycle";
import { makeJsonRequest } from "../utils/next";

const auditLogMock = vi.fn(async () => undefined);

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
  AuditEventType: {
    OC_BULK_IMPORTED: "oc.bulk.imported",
  },
  AuditResourceType: {
    OC: "oc",
  },
}));

vi.mock("@/app/api/v1/oc/_checks", () => ({
  mustBeAuthed: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkApiRateLimit: vi.fn(async () => ({ success: true, limit: 100, remaining: 99, reset: 123 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  getRateLimitHeaders: vi.fn(() => new Headers()),
}));

vi.mock("@/app/db/client", () => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@/app/db/queries/oc-lifecycle", () => ({
  createOcWithLifecycle: vi.fn(),
}));

describe("POST /api/v1/oc/bulk-upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ocChecks.mustBeAuthed).mockResolvedValue({
      userId: "admin-1",
      roles: ["ADMIN"],
    } as any);
  });

  it("creates OC lifecycle rows through the shared zero-loss helper", async () => {
    (db.select as any)
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: "course-1" }],
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }));

    (db.transaction as any).mockImplementation(async (callback: any) => callback({ tx: true }));
    vi.mocked(ocLifecycle.createOcWithLifecycle).mockResolvedValueOnce({
      oc: { id: "oc-1" },
      enrollment: { id: "enrollment-1" },
    } as any);

    const req = makeJsonRequest({
      method: "POST",
      path: "/api/v1/oc/bulk-upload",
      body: {
        rows: [
          {
            "Tes No": "TES-9001",
            Name: "Bulk OC",
            Course: "TES-50",
            "Dt of Arrival": "2026-01-01",
            Games: "Football",
            Hobbies: "Reading",
          },
        ],
      },
    });

    const res = await bulkUploadOc(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(1);
    expect(body.failed).toBe(0);
    expect(ocLifecycle.createOcWithLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Bulk OC",
        ocNo: "TES-9001",
        courseId: "course-1",
        platoonId: null,
        actorUserId: "admin-1",
        personal: expect.objectContaining({
          games: "Football",
          hobbies: "Reading",
        }),
      }),
      { tx: true },
    );
  });
});
