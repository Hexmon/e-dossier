import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as completeOcImage } from "@/app/api/v1/oc/[ocId]/images/complete/route";
import { POST as presignOcImage } from "@/app/api/v1/oc/[ocId]/images/presign/route";
import { makeJsonRequest, createRouteContext } from "../utils/next";

import * as ocChecks from "@/app/api/v1/oc/_checks";
import * as storage from "@/app/lib/storage";
import * as ocQueries from "@/app/db/queries/oc";

const auditLogMock = vi.fn(async () => undefined);

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
  AuditEventType: {
    OC_RECORD_CREATED: "oc.record.created",
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
  deleteObject: vi.fn(async () => undefined),
  getPublicObjectUrl: vi.fn(() => "https://public-url"),
  getStorageConfig: vi.fn(() => ({ bucket: "edossier" })),
  headObject: vi.fn(async () => ({
    ContentLength: 1024,
    ContentType: "image/png",
    ETag: '"etag-1"',
  })),
}));

vi.mock("@/app/db/queries/oc", () => ({
  getOcImage: vi.fn(async () => null),
  upsertOcImage: vi.fn(async (_ocId: string, kind: string, values: any) => ({
    id: "image-1",
    ocId,
    kind,
    ...values,
  })),
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
    expect(body.maxSizeBytes).toBe(200 * 1024);
    expect(body.minSizeBytes).toBeUndefined();
  });

  it("allows a valid image request below the old 20 KB lower bound", async () => {
    const req = makeJsonRequest({
      method: "POST",
      path: `/api/v1/oc/${ocId}/images/presign`,
      body: {
        kind: "UNIFORM",
        contentType: "image/png",
        sizeBytes: 1024,
      },
    });

    const res = await presignOcImage(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploadUrl).toBe("https://upload-url");
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

describe("POST /api/v1/oc/[ocId]/images/complete", () => {
  it("saves an uploaded image below the old 20 KB lower bound", async () => {
    vi.mocked(storage.headObject).mockResolvedValueOnce({
      ContentLength: 1024,
      ContentType: "image/png",
      ETag: '"etag-1"',
    } as any);

    const objectKey = `oc/${ocId}/uniform/image.png`;
    const req = makeJsonRequest({
      method: "POST",
      path: `/api/v1/oc/${ocId}/images/complete`,
      body: {
        kind: "UNIFORM",
        objectKey,
      },
    });

    const res = await completeOcImage(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(ocQueries.upsertOcImage).toHaveBeenCalledWith(ocId, "UNIFORM", expect.objectContaining({
      objectKey,
      contentType: "image/png",
      sizeBytes: 1024,
    }));
    expect(body.publicUrl).toBe("https://public-url");
  });
});
