import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MinIO data stack CORS init", () => {
  it("uses global MinIO CORS instead of the unsupported bucket CORS init path", () => {
    const compose = readFileSync(
      join(process.cwd(), "deploy/docker-compose.data.yml"),
      "utf8"
    );

    expect(compose).toContain("MINIO_API_CORS_ALLOW_ORIGIN");
    expect(compose).not.toContain("mc cors set");
    expect(compose).not.toContain("/tmp/minio-cors.xml");
    expect(compose).not.toContain("/tmp/minio-cors.json");
    expect(compose).not.toContain("CORSRules");
  });
});
