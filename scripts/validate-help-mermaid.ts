#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import mermaid from 'mermaid';

type MermaidBlock = {
  filePath: string;
  blockIndex: number;
  chart: string;
};

function collectMarkdownFiles(rootDir: string): string[] {
  const out: string[] = [];

  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.md')) {
        out.push(fullPath);
      }
    }
  }

  if (fs.existsSync(rootDir)) {
    walk(rootDir);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function collectMermaidBlocks(filePath: string): MermaidBlock[] {
  const source = fs.readFileSync(filePath, 'utf8');
  const regex = /```mermaid\s*([\s\S]*?)```/g;
  const blocks: MermaidBlock[] = [];
  let match: RegExpExecArray | null = null;
  let index = 0;

  while ((match = regex.exec(source)) !== null) {
    index += 1;
    blocks.push({
      filePath,
      blockIndex: index,
      chart: match[1].trim(),
    });
  }

  return blocks;
}

function installMinimalDom(): void {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const win = dom.window as unknown as Window & typeof globalThis;

  Object.defineProperty(globalThis, 'window', {
    value: win,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'document', {
    value: win.document,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'navigator', {
    value: win.navigator,
    configurable: true,
  });
}

async function validateBlock(block: MermaidBlock): Promise<string | null> {
  try {
    await mermaid.parse(block.chart, {
      suppressErrors: false,
    });
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `${block.filePath}#${block.blockIndex}: ${message}`;
  }
}

async function main() {
  const helpDocsRoot = path.join(process.cwd(), 'docs', 'help');
  const markdownFiles = collectMarkdownFiles(helpDocsRoot);

  installMinimalDom();
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'default',
  });

  const blocks = markdownFiles.flatMap((filePath) => collectMermaidBlocks(filePath));
  const failures: string[] = [];

  for (const block of blocks) {
    const failure = await validateBlock(block);
    if (failure) failures.push(failure);
  }

  if (failures.length > 0) {
    console.error('Mermaid validation failed for help docs:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Help Mermaid validation passed: ${blocks.length} diagram(s) across ${markdownFiles.length} file(s).`
  );
}

main().catch((error) => {
  console.error('Failed to validate help Mermaid blocks:', error);
  process.exit(1);
});
