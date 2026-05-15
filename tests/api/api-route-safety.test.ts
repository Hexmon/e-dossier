import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const METHODS = "GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD";

describe("API route safety coverage", () => {
  it("wraps every v1 route handler export with withAuditRoute", () => {
    const files = execSync("find src/app/api/v1 -name route.ts", {
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
    const failures: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const functionExport = new RegExp(
        `export\\s+(?:async\\s+)?function\\s+(${METHODS})\\b`,
        "g"
      );
      let functionExportCount = 0;
      for (const match of source.matchAll(functionExport)) {
        functionExportCount += 1;
        failures.push(`${file}: export function ${match[1]} is not wrapped`);
      }

      const constExport = new RegExp(
        `export\\s+const\\s+(${METHODS})\\s*=\\s*([^;\\n]+)`,
        "g"
      );
      let routeExportCount = 0;
      for (const match of source.matchAll(constExport)) {
        routeExportCount += 1;
        if (!match[2]?.includes("withAuditRoute")) {
          failures.push(`${file}: export const ${match[1]} is not wrapped`);
        }
      }

      if (routeExportCount === 0 && functionExportCount === 0) {
        failures.push(`${file}: no route handler export found`);
      }
    }

    expect(failures).toEqual([]);
  });
});
