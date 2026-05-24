import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const originalStandaloneEnv = process.env.NEXT_BUILD_STANDALONE;
const nextConfigUrl = pathToFileURL(path.join(process.cwd(), "next.config.ts")).href;

async function loadNextConfig() {
  const module = await import(`${nextConfigUrl}?testCase=${randomUUID()}`);
  return module.default;
}

afterEach(() => {
  if (originalStandaloneEnv === undefined) {
    delete process.env.NEXT_BUILD_STANDALONE;
  } else {
    process.env.NEXT_BUILD_STANDALONE = originalStandaloneEnv;
  }
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
