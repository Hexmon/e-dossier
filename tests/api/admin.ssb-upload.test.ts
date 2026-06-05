import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/admin/ssb-upload/route";
import { POST as uploadPdf } from "@/app/api/v1/admin/ssb-upload/[ocId]/route";
import { POST as viewPdf } from "@/app/api/v1/admin/ssb-upload/[ocId]/view/route";
import { createRouteContext, makeJsonRequest } from "../utils/next";

const auditLogMock = vi.fn(async () => undefined);

vi.mock("@/lib/audit", () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
  AuditEventType: {
    API_REQUEST: "api.request",
    OC_RECORD_UPDATED: "oc.record.updated",
    SENSITIVE_DATA_EXPORTED: "sensitive.data.exported",
  },
  AuditResourceType: {
    COURSE: "course",
    OC: "oc",
  },
}));

vi.mock("@/app/lib/authz", () => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/app/db/queries/ssb-upload", () => ({
  listCourseSsbUploadRows: vi.fn(),
  getOcSsbUploadSummary: vi.fn(),
  getOcSsbUpload: vi.fn(),
  saveOcSsbUpload: vi.fn(),
}));

vi.mock("@/app/lib/storage", () => ({
  putObjectBytes: vi.fn(async () => undefined),
  deleteObject: vi.fn(async () => undefined),
  getObjectBytes: vi.fn(),
}));

vi.mock("argon2", () => ({
  hash: vi.fn(async () => "argon-hash"),
  verify: vi.fn(),
}));

import * as authz from "@/app/lib/authz";
import * as ssbQueries from "@/app/db/queries/ssb-upload";
import * as storage from "@/app/lib/storage";
import * as argon2 from "argon2";
import { encryptSsbStoredPassword } from "@/app/lib/ssb-upload-crypto";

const courseId = "11111111-1111-4111-8111-111111111111";
const ocId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authz.requireAuth).mockResolvedValue({ userId: "user-1", claims: {} } as any);
  vi.mocked(authz.requireAdmin).mockResolvedValue({ userId: "admin-1", claims: {} } as any);
});

describe("GET /api/v1/admin/ssb-upload", () => {
  it("requires admin access and lists course OCs with saved passwords", async () => {
    vi.mocked(ssbQueries.listCourseSsbUploadRows).mockResolvedValueOnce([
      {
        ocId,
        ocNo: "101",
        name: "OC One",
        courseId,
        courseCode: "TES-50",
        courseTitle: "TES",
        fileName: "ssb.pdf",
        sizeBytes: 120,
        uploadedAt: new Date("2026-01-01T00:00:00Z"),
        savedPasswordCiphertext: encryptSsbStoredPassword("report-pass"),
      },
    ]);

    const req = makeJsonRequest({ method: "GET", path: `/api/v1/admin/ssb-upload?courseId=${courseId}` });
    const res = await GET(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(authz.requireAdmin).toHaveBeenCalledTimes(1);
    expect(body.items[0]).toMatchObject({ ocId, hasUpload: true, savedPassword: "report-pass" });
    expect(body.items[0].savedPasswordCiphertext).toBeUndefined();
  });
});

describe("POST /api/v1/admin/ssb-upload/[ocId]", () => {
  it("encrypts the uploaded PDF and stores persistent password view metadata", async () => {
    vi.mocked(ssbQueries.getOcSsbUploadSummary).mockResolvedValueOnce({
      ocId,
      ocNo: "101",
      name: "OC One",
      courseId,
      fileName: null,
      sizeBytes: null,
      uploadedAt: null,
    } as any);
    vi.mocked(ssbQueries.saveOcSsbUpload).mockResolvedValueOnce({
      oldObjectKey: null,
      saved: { ssbPdfUploadedAt: new Date("2026-01-01T00:00:00Z") },
    } as any);

    const form = new FormData();
    form.set("file", new Blob([Buffer.from("%PDF-1.7\n")], { type: "application/pdf" }), "ssb.pdf");
    form.set("password", "report-pass");
    const req = new Request(`http://localhost/api/v1/admin/ssb-upload/${ocId}`, { method: "POST", body: form });

    const res = await uploadPdf(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(storage.putObjectBytes).toHaveBeenCalledWith(expect.objectContaining({
      contentType: "application/octet-stream",
      key: expect.stringContaining(`ssb-upload/${ocId}/`),
    }));
    expect(argon2.hash).toHaveBeenCalledWith("report-pass");
    expect(ssbQueries.saveOcSsbUpload).toHaveBeenCalledWith(expect.objectContaining({
      ocId,
      passwordHash: "argon-hash",
      passwordCiphertext: expect.stringMatching(/^v1:/),
      fileName: "ssb.pdf",
    }));
    expect(body.item.hasUpload).toBe(true);
    expect(body.item.savedPassword).toBe("report-pass");
  });
});

describe("POST /api/v1/admin/ssb-upload/[ocId]/view", () => {
  it("rejects an incorrect password before reading the encrypted object", async () => {
    vi.mocked(ssbQueries.getOcSsbUpload).mockResolvedValueOnce({
      objectKey: "ssb-upload/file.pdf.enc",
      fileName: "ssb.pdf",
      passwordHash: "argon-hash",
      salt: "00",
      iv: "00",
      authTag: "00",
    } as any);
    vi.mocked(argon2.verify).mockResolvedValueOnce(false as never);

    const req = makeJsonRequest({
      method: "POST",
      path: `/api/v1/admin/ssb-upload/${ocId}/view`,
      body: { password: "wrong" },
    });
    const res = await viewPdf(req as any, createRouteContext({ ocId }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("forbidden");
    expect(storage.getObjectBytes).not.toHaveBeenCalled();
  });
});
