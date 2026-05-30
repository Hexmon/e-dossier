import { afterEach, describe, expect, it } from "vitest";

import {
  getStorageConfig,
  getObjectKeyFromPublicUrl,
  normalizeStorageEndpoint,
  normalizeStoragePublicBaseUrl,
  rewriteStorageUrlToPublicBase,
  StorageConfigError,
} from "@/app/lib/storage";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("storage config", () => {
  it("normalizes a host endpoint with a configured port", () => {
    expect(
      normalizeStorageEndpoint({
        endpoint: "127.0.0.1",
        useSsl: false,
        port: "9000",
      })
    ).toBe("http://127.0.0.1:9000");
  });

  it("keeps an explicit endpoint port", () => {
    expect(
      normalizeStorageEndpoint({
        endpoint: "127.0.0.1:9005",
        useSsl: false,
        port: "9000",
      })
    ).toBe("http://127.0.0.1:9005");
  });

  it("preserves a full URL endpoint with a proxy path", () => {
    expect(
      normalizeStorageEndpoint({
        endpoint: "https://storage.example.test/media/",
        useSsl: false,
        port: "9000",
      })
    ).toBe("https://storage.example.test/media");
  });

  it("uses the endpoint as the public base URL when no public URL is set", () => {
    expect(normalizeStoragePublicBaseUrl("http://127.0.0.1:9000/", undefined)).toBe(
      "http://127.0.0.1:9000"
    );
  });

  it("rewrites signed storage URLs through the public media proxy", () => {
    const signedUrl =
      "http://172.22.128.56:9000/oc-images/oc/123/civil_dress/photo.png?X-Amz-SignedHeaders=host&X-Amz-Signature=abc123";

    expect(
      rewriteStorageUrlToPublicBase(signedUrl, {
        endpoint: "http://172.22.128.56:9000",
        publicBaseUrl: "http://172.22.128.57/media",
      })
    ).toBe(
      "http://172.22.128.57/media/oc-images/oc/123/civil_dress/photo.png?X-Amz-SignedHeaders=host&X-Amz-Signature=abc123"
    );
  });

  it("derives an object key from a stored public object URL", () => {
    process.env = {
      ...ORIGINAL_ENV,
      MINIO_ENDPOINT: "127.0.0.1",
      MINIO_ACCESS_KEY: "minioadmin",
      MINIO_SECRET_KEY: "minioadmin",
      MINIO_BUCKET: "edossier",
    };

    expect(getObjectKeyFromPublicUrl("http://127.0.0.1:9000/edossier/relegation/abc.pdf")).toBe(
      "relegation/abc.pdf"
    );
  });

  it("throws a storage config error when required env vars are missing", () => {
    process.env = {
      ...ORIGINAL_ENV,
      MINIO_ENDPOINT: "127.0.0.1",
      MINIO_ACCESS_KEY: "minioadmin",
      MINIO_BUCKET: "edossier",
      MINIO_SECRET_KEY: "",
    };

    expect(() => getStorageConfig()).toThrow(StorageConfigError);
  });
});
