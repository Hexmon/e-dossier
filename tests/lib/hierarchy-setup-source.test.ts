import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("hierarchy setup source checks", () => {
  it("exposes root creation when the hierarchy tree is empty", () => {
    const source = readSource("src/app/dashboard/genmgmt/hierarchy/page.tsx");

    expect(source).toContain("openCreateRootInspector");
    expect(source).toContain("Create Root Node");
    expect(source).toContain('key: nodeType === "ROOT" ? "CTW_ROOT" : ""');
    expect(source).toContain('name: nodeType === "ROOT" ? "Cadets Training Wing" : ""');
    expect(source).toContain("Create the root node first. After that, add each active platoon below it.");
  });

  it("lets initial setup create the root before linking platoon nodes", () => {
    const source = readSource("src/components/setup/SetupPageClient.tsx");

    expect(source).toContain('key: "CTW_ROOT"');
    expect(source).toContain('name: "Cadets Training Wing"');
    expect(source).toContain('nodeType: "ROOT"');
    expect(source).toContain("Create Root & Platoon Nodes");
    expect(source).toContain("Create the ROOT node, then link each active platoon as a PLATOON node.");
  });
});
