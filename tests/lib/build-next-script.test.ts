import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  cleanStaleBuildArtifacts,
  STALE_BUILD_ARTIFACTS,
} from "../../scripts/build-next";

const tempRoots: string[] = [];

function makeTempNextDir() {
  const root = path.join(process.cwd(), `.tmp-build-next-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const nextDir = path.join(root, ".next");
  mkdirSync(nextDir, { recursive: true });
  tempRoots.push(root);
  return nextDir;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe("build-next cleanup", () => {
  it("removes stale Next cache and build artifacts before production build", () => {
    const nextDir = makeTempNextDir();

    for (const artifact of STALE_BUILD_ARTIFACTS) {
      const target = path.join(nextDir, artifact);
      if (path.extname(artifact)) {
        writeFileSync(target, "stale");
      } else {
        mkdirSync(target, { recursive: true });
        writeFileSync(path.join(target, "stale.txt"), "stale");
      }
    }
    writeFileSync(path.join(nextDir, "keep.txt"), "keep");

    cleanStaleBuildArtifacts(nextDir);

    expect(STALE_BUILD_ARTIFACTS).toEqual(expect.arrayContaining(["cache", "diagnostics", "server"]));
    for (const artifact of STALE_BUILD_ARTIFACTS) {
      expect(existsSync(path.join(nextDir, artifact))).toBe(false);
    }
    expect(existsSync(path.join(nextDir, "keep.txt"))).toBe(true);
  });
});
