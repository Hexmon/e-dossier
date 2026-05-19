import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as presignOcImage } from "@/app/api/v1/oc/[ocId]/images/presign/route";
import { makeJsonRequest, createRouteContext } from "../utils/next";

import * as ocChecks from "@/app/api/v1/oc/_checks";
import * as storage from "@/app/lib/storage";

const auditLogMock = vi.fn(async () => undefined);

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
  AuditEventType: {
    OC_RECORD_UPDATED: "oc.record.updated",
  },
  AuditResourceType: {
    OC: "oc",
  },
}));

vi.mock("@/app/api/v1/oc/_checks", () => ({
  mustBeAuthed: vi.fn(),
  parseParam: vi.fn(),
  ensureOcExists: vi.fn(),
}));

vi.mock("@/app/lib/storage", () => ({
  buildImageKey: vi.fn(() => "oc/11111111-1111-4111-8111-111111111111/uniform/image.png"),
  createPresignedUploadUrl: vi.fn(async () => "https://upload-url"),
  getPublicObjectUrl: vi.fn(() => "https://public-url"),
  getStorageConfig: vi.fn(() => ({ bucket: "edossier" })),
}));

const ocId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ocChecks.mustBeAuthed).mockResolvedValue({
    userId: "user-1",
    roles: ["ADMIN"],
  } as Awaited<ReturnType<typeof ocChecks.mustBeAuthed>>);
  vi.mocked(ocChecks.parseParam).mockResolvedValue({ ocId });
  vi.mocked(ocChecks.ensureOcExists).mockResolvedValue(undefined);
});

describe("POST /api/v1/oc/[ocId]/images/presign", () => {
  it("returns upload data for a valid image request", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: `/api/v1/oc/${ocId}/images/presign`,
      body: {
        kind: "UNIFORM",
        contentType: "image/png",
        sizeBytes: 25 * 1024,
      },
    });

    const res = await presignOcImage(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploadUrl).toBe("https://upload-url");
    expect(body.publicUrl).toBe("https://public-url");
    expect(body.bucket).toBe("edossier");
  });

  it("returns storage 503 when upload signing fails", async () => {
    vi.mocked(storage.createPresignedUploadUrl).mockRejectedValueOnce(
      Object.assign(new Error("File storage is unavailable. Check MinIO/storage configuration."), {
        name: "StorageUnavailableError",
        service: "storage",
        retryable: true,
      })
    );

    const req = makeJsonRequest({
      method: "POST",
      path: `/api/v1/oc/${ocId}/images/presign`,
      body: {
        kind: "UNIFORM",
        contentType: "image/png",
        sizeBytes: 25 * 1024,
      },
    });

    const res = await presignOcImage(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      status: 503,
      error: "service_unavailable",
      service: "storage",
      retryable: true,
      message: "File storage is unavailable. Check MinIO/storage configuration.",
    });
  });
});
