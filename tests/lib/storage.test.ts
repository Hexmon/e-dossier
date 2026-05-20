import { afterEach, describe, expect, it } from "vitest";

import {
  getStorageConfig,
  normalizeStorageEndpoint,
  normalizeStoragePublicBaseUrl,
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
