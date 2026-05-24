import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("site settings footer editor source checks", () => {
  it("shows a multiline landing-style preview while editing the footer", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/dashboard/genmgmt/settings/site/page.tsx"),
      "utf8",
    );

    expect(source).toContain("whitespace-pre-line break-words text-sm leading-relaxed text-shadow-md");
    expect(source).toContain('{footerForm.trim() || "Footer preview"}');
  });
});
