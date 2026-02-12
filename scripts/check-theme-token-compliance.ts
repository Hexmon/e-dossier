import fs from "node:fs";
import path from "node:path";

const SRC_ROOT = path.join(process.cwd(), "src");

const ALLOWLIST = new Set([
  path.normalize("src/app/globals.css"),
  path.normalize("src/lib/accent-palette.ts"),
  path.normalize("src/lib/device-site-settings.ts"),
  path.normalize("src/components/performance_graph/chartTheme.ts"),
]);

type PatternCheck = {
  name: string;
  regex: RegExp;
};

const checks: PatternCheck[] = [
  {
    name: "hardcoded utility color class",
    regex:
      /\b(?:bg|text|border|hover:bg|hover:text|hover:border)-(?:black|white|gray|slate|zinc|neutral|stone|blue|red|green|yellow|purple|indigo|teal|cyan|sky|violet|amber|orange)-\d{2,3}(?:\/\d{1,3})?\b/g,
  },
  {
    name: "hex color literal",
    regex: /#[0-9a-fA-F]{3,8}\b/g,
  },
  {
    name: "rgb/hsl color literal",
    regex: /\b(?:rgb|rgba|hsl|hsla)\(/g,
  },
];

type Violation = {
  file: string;
  line: number;
  column: number;
  check: string;
  snippet: string;
};

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx|js|jsx|css)$/.test(entry.name)) continue;
    files.push(fullPath);
  }

  return files;
}

function lineAndColumn(content: string, index: number): { line: number; column: number } {
  const upto = content.slice(0, index);
  const lines = upto.split("\n");
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
}

function excerpt(content: string, index: number, length: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(content.length, index + length + 40);
  return content.slice(start, end).replace(/\s+/g, " ").trim();
}

const violations: Violation[] = [];

for (const filePath of walk(SRC_ROOT)) {
  const relative = path.normalize(path.relative(process.cwd(), filePath));
  if (ALLOWLIST.has(relative)) continue;

  const content = fs.readFileSync(filePath, "utf8");

  for (const check of checks) {
    for (const match of content.matchAll(check.regex)) {
      const index = match.index ?? 0;
      const token = match[0] ?? "";
      const { line, column } = lineAndColumn(content, index);

      violations.push({
        file: relative,
        line,
        column,
        check: check.name,
        snippet: excerpt(content, index, token.length),
      });
    }
  }
}

if (violations.length > 0) {
  console.error("Theme token compliance failed. Found forbidden color usage:\n");
  for (const v of violations) {
    console.error(`${v.file}:${v.line}:${v.column} [${v.check}] ${v.snippet}`);
  }
  process.exit(1);
}

console.log("Theme token compliance passed.");
