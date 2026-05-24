import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const originalStandaloneEnv = process.env.NEXT_BUILD_STANDALONE;
const originalNodeEnv = process.env.NODE_ENV;
const originalMinioEndpoint = process.env.MINIO_ENDPOINT;
const originalMinioPort = process.env.MINIO_PORT;
const originalMinioUseSsl = process.env.MINIO_USE_SSL;
const originalMinioPublicUrl = process.env.MINIO_PUBLIC_URL;
const originalMinioBrowserOrigins = process.env.MINIO_BROWSER_ORIGINS;
const nextConfigUrl = pathToFileURL(path.join(process.cwd(), "next.config.ts")).href;

async function loadNextConfig() {
  const module = await import(`${nextConfigUrl}?testCase=${randomUUID()}`);
  return module.default;
}

function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

async function getCspHeaderValue() {
  const config = await loadNextConfig();
  const routes = await config.headers();
  return routes[0].headers.find((header: { key: string }) => header.key === "Content-Security-Policy")?.value;
}

afterEach(() => {
  restoreEnvValue("NEXT_BUILD_STANDALONE", originalStandaloneEnv);
  restoreEnvValue("NODE_ENV", originalNodeEnv);
  restoreEnvValue("MINIO_ENDPOINT", originalMinioEndpoint);
  restoreEnvValue("MINIO_PORT", originalMinioPort);
  restoreEnvValue("MINIO_USE_SSL", originalMinioUseSsl);
  restoreEnvValue("MINIO_PUBLIC_URL", originalMinioPublicUrl);
  restoreEnvValue("MINIO_BROWSER_ORIGINS", originalMinioBrowserOrigins);
});

describe("Next build output mode", () => {
  it("uses standard output for the normal build script", async () => {
    process.env.NEXT_BUILD_STANDALONE = "false";

    const config = await loadNextConfig();

    expect(config.output).toBeUndefined();
  });

  it("keeps standalone output available for explicit runtime packaging", async () => {
    process.env.NEXT_BUILD_STANDALONE = "true";

    const config = await loadNextConfig();

    expect(config.output).toBe("standalone");
  });
});

describe("Next production CSP MinIO origins", () => {
  it("allows direct MinIO browser uploads when direct on-prem origin is configured", async () => {
    process.env.NODE_ENV = "production";
    process.env.MINIO_ENDPOINT = "172.22.128.56";
    process.env.MINIO_PORT = "9000";
    process.env.MINIO_USE_SSL = "false";
    process.env.MINIO_PUBLIC_URL = "http://172.22.128.56:9000";
    process.env.MINIO_BROWSER_ORIGINS = "http://172.22.128.56:9000";

    const csp = await getCspHeaderValue();

    expect(csp).toContain("img-src 'self' data: blob: http://172.22.128.56:9000");
    expect(csp).toContain("connect-src 'self' http://172.22.128.56:9000");
  });

  it("derives the local MinIO browser origin from MINIO_PUBLIC_URL", async () => {
    process.env.NODE_ENV = "production";
    process.env.MINIO_ENDPOINT = "127.0.0.1";
    process.env.MINIO_PORT = "9000";
    process.env.MINIO_USE_SSL = "false";
    process.env.MINIO_PUBLIC_URL = "http://localhost:9000";
    delete process.env.MINIO_BROWSER_ORIGINS;

    const csp = await getCspHeaderValue();

    expect(csp).toContain("img-src 'self' data: blob: http://localhost:9000 http://127.0.0.1:9000");
    expect(csp).toContain("connect-src 'self' http://localhost:9000 http://127.0.0.1:9000");
  });

  it("supports proxy-mode MinIO URLs without leaking the path into CSP", async () => {
    process.env.NODE_ENV = "production";
    process.env.MINIO_ENDPOINT = "http://172.22.128.57/media";
    process.env.MINIO_PUBLIC_URL = "http://172.22.128.57/media";
    delete process.env.MINIO_BROWSER_ORIGINS;

    const csp = await getCspHeaderValue();

    expect(csp).toContain("img-src 'self' data: blob: http://172.22.128.57");
    expect(csp).toContain("connect-src 'self' http://172.22.128.57");
    expect(csp).not.toContain("/media");
  });
});
