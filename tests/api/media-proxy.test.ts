import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, OPTIONS, PUT } from "@/app/media/[...path]/route";
import { getStorageConfig } from "@/app/lib/storage";

vi.mock("@/app/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/storage")>();
  return {
    ...actual,
    getStorageConfig: vi.fn(),
  };
});

const ORIGINAL_ENV = { ...process.env };
const context = {
  params: Promise.resolve({
    path: ["oc-image", "site-settings", "logo", "logo.jpg"],
  }),
} as any;

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    MINIO_BROWSER_ORIGINS: "http://172.22.128.57:3000",
    MINIO_PUBLIC_URL: "http://172.22.128.57:3000/media",
    NEXT_PUBLIC_API_BASE_URL: "http://172.22.128.57:3000",
  };

  vi.mocked(getStorageConfig).mockReturnValue({
    endpoint: "http://172.22.128.56:9000",
    bucket: "oc-image",
    region: "us-east-1",
    accessKeyId: "minioadmin",
    secretAccessKey: "secret",
    publicBaseUrl: "http://172.22.128.57:3000/media",
  } as any);

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("ok", { status: 200, headers: { "content-type": "text/plain" } }))
  );
});

describe("/media proxy", () => {
  it("answers browser preflight from the configured app origin", async () => {
    const req = new Request("http://172.22.128.57:3000/media/oc-image/site-settings/logo/logo.jpg", {
      method: "OPTIONS",
      headers: {
        origin: "http://172.22.128.57:3000",
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type",
      },
    });

    const res = await OPTIONS(req as any);

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://172.22.128.57:3000");
    expect(res.headers.get("access-control-allow-methods")).toContain("PUT");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("proxies PUT uploads to the private MinIO endpoint while keeping the presigned query", async () => {
    const req = new Request(
      "http://172.22.128.57:3000/media/oc-image/site-settings/logo/logo.jpg?X-Amz-SignedHeaders=host&x-id=PutObject",
      {
        method: "PUT",
        headers: {
          "content-type": "image/jpeg",
          origin: "http://172.22.128.57:3000",
        },
        body: "image-bytes",
      }
    );

    const res = await PUT(req as any, context);
    const [targetUrl, init] = vi.mocked(fetch).mock.calls[0];

    expect(res.status).toBe(200);
    expect(targetUrl).toBe(
      "http://172.22.128.56:9000/oc-image/site-settings/logo/logo.jpg?X-Amz-SignedHeaders=host&x-id=PutObject"
    );
    expect(init?.method).toBe("PUT");
    expect((init?.headers as Headers).get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("access-control-allow-origin")).toBe("http://172.22.128.57:3000");
  });

  it("proxies GET reads through the app VM media URL", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("image", {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          etag: '"abc"',
        },
      })
    );

    const req = new Request(
      "http://172.22.128.57:3000/media/oc-image/site-settings/logo/logo.jpg?X-Amz-SignedHeaders=host&x-id=GetObject",
      { method: "GET" }
    );

    const res = await GET(req as any, context);
    const [targetUrl, init] = vi.mocked(fetch).mock.calls[0];

    expect(res.status).toBe(200);
    expect(targetUrl).toBe(
      "http://172.22.128.56:9000/oc-image/site-settings/logo/logo.jpg?X-Amz-SignedHeaders=host&x-id=GetObject"
    );
    expect(init?.method).toBe("GET");
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("etag")).toBe('"abc"');
    expect(await res.text()).toBe("image");
  });
});
