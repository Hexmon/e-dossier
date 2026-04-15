#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const REQUIRED_FILES = [
  'docs/README.md',
  'docs/engineering/README.md',
  'docs/engineering/reference/README.md',
  'docs/operations/README.md',
  'docs/governance/README.md',
  'docs/governance/reference/docs-standards.md',
  'docs/reference/README.md',
  'docs/reference/rbac/README.md',
  'docs/help/README.md',
];

const LEGACY_STUBS = new Set([
  'docs/PROJECT_OVERVIEW.md',
  'docs/KEY_FLOWS.md',
  'docs/AUTH_AND_SECURITY.md',
  'docs/DB_MODEL_GUIDE.md',
  'docs/UI_STATE_GUIDE.md',
  'docs/TESTING_GUIDE.md',
  'docs/THEMING_GUIDE.md',
  'docs/CONTRIBUTING.md',
  'docs/onprem-storage.md',
  'docs/oc-images.md',
  'docs/dev_guide/CODE_FLOW_MAP.md',
  'docs/dev_guide/NEW_DEV_ONBOARDING.md',
  'docs/dev_guide/FEATURE_EXAMPLES.md',
  'docs/deploy/AIRGAP_RUNTIME_DEPLOYMENT.md',
  'docs/deploy/AIRGAP_SCHEMA_RELEASE.md',
  'docs/deploy/AIRGAP_VM1_BOOTSTRAP.md',
  'docs/deploy/DEPLOYMENT_GUIDE.md',
  'docs/db/delete-policy.md',
  'docs/db/data-dictionary.md',
  'security/README.md',
]);

const LEGACY_DIRS = new Map<string, string[]>([
  ['docs/dev_guide', [
    'docs/dev_guide/CODE_FLOW_MAP.md',
    'docs/dev_guide/NEW_DEV_ONBOARDING.md',
    'docs/dev_guide/FEATURE_EXAMPLES.md',
  ]],
  ['docs/deploy', [
    'docs/deploy/AIRGAP_RUNTIME_DEPLOYMENT.md',
    'docs/deploy/AIRGAP_SCHEMA_RELEASE.md',
    'docs/deploy/AIRGAP_VM1_BOOTSTRAP.md',
    'docs/deploy/DEPLOYMENT_GUIDE.md',
  ]],
  ['docs/db', [
    'docs/db/delete-policy.md',
    'docs/db/data-dictionary.md',
  ]],
  ['security', ['security/README.md']],
]);

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function toRepoPath(fullPath: string) {
  return path.relative(ROOT, fullPath).replace(/\\/g, '/');
}

function ensureExists(relPath: string, errors: string[]) {
  if (!fs.existsSync(path.join(ROOT, relPath))) {
    errors.push(`Missing required documentation file: ${relPath}`);
  }
}

function isMarkdown(relPath: string) {
  return /\.md$/i.test(relPath);
}

function validateFilename(relPath: string, errors: string[]) {
  if (!isMarkdown(relPath)) return;
  const base = path.basename(relPath);
  if (base === 'README.md') return;
  if (LEGACY_STUBS.has(relPath)) return;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(base)) {
    errors.push(`Non-canonical Markdown filename: ${relPath}`);
  }
}

function validateLegacyStub(relPath: string, errors: string[]) {
  if (!LEGACY_STUBS.has(relPath)) return;
  const fullPath = path.join(ROOT, relPath);
  const text = fs.readFileSync(fullPath, 'utf8');
  if (!/legacy compatibility stub/i.test(text)) {
    errors.push(`Legacy stub is missing the required compatibility marker: ${relPath}`);
  }
}

function resolveLocalTarget(fromFile: string, target: string) {
  const [filePart] = target.split('#');
  if (!filePart) return null;
  if (
    filePart.startsWith('http://') ||
    filePart.startsWith('https://') ||
    filePart.startsWith('mailto:') ||
    filePart.startsWith('/')
  ) {
    return null;
  }

  const resolved = path.resolve(path.dirname(fromFile), filePart);
  if (fs.existsSync(resolved)) return resolved;
  const readmeCandidate = path.join(resolved, 'README.md');
  if (fs.existsSync(readmeCandidate)) return readmeCandidate;
  return resolved;
}

function validateLinks(relPath: string, errors: string[]) {
  if (!isMarkdown(relPath)) return;
  const fullPath = path.join(ROOT, relPath);
  const text = fs.readFileSync(fullPath, 'utf8');
  const regex = /!?\[[^\]]+\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const target = match[1];
    if (target.startsWith('#')) continue;
    const resolved = resolveLocalTarget(fullPath, target);
    if (!resolved) continue;
    if (!fs.existsSync(resolved)) {
      errors.push(`Broken local docs link in ${relPath}: ${target}`);
    }
  }
}

function validateLegacyDirs(errors: string[]) {
  for (const [dir, allowedPaths] of LEGACY_DIRS.entries()) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    const files = walk(fullDir)
      .filter((file) => fs.statSync(file).isFile())
      .map(toRepoPath)
      .sort();
    const allowed = [...allowedPaths].sort();
    if (files.length !== allowed.length || files.some((file, index) => file !== allowed[index])) {
      errors.push(`Legacy compatibility directory contains unexpected files: ${dir}`);
    }
  }
}

function validateCanonicalLayout(errors: string[]) {
  const topLevelDocsFiles = fs
    .readdirSync(path.join(ROOT, 'docs'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.md$/i.test(entry.name))
    .map((entry) => `docs/${entry.name}`)
    .sort();

  const allowedRootMarkdown = ['docs/README.md', ...Array.from(LEGACY_STUBS).filter((rel) => rel.startsWith('docs/') && !rel.includes('/', 5))].sort();
  for (const file of topLevelDocsFiles) {
    if (!allowedRootMarkdown.includes(file)) {
      errors.push(`Unexpected Markdown file at docs root: ${file}`);
    }
  }

  const generatedDir = path.join(ROOT, 'docs', 'reference', 'database', 'generated');
  if (!fs.existsSync(generatedDir)) {
    errors.push('Missing generated database reference directory: docs/reference/database/generated');
  }
}

function main() {
  const errors: string[] = [];

  for (const relPath of REQUIRED_FILES) ensureExists(relPath, errors);

  const candidateRoots = ['docs', 'security'];
  const allFiles = candidateRoots
    .filter((dir) => fs.existsSync(path.join(ROOT, dir)))
    .flatMap((dir) => walk(path.join(ROOT, dir)))
    .filter((file) => fs.statSync(file).isFile())
    .map(toRepoPath);

  for (const relPath of allFiles) {
    validateFilename(relPath, errors);
    validateLegacyStub(relPath, errors);
    validateLinks(relPath, errors);
  }

  validateLegacyDirs(errors);
  validateCanonicalLayout(errors);

  if (errors.length) {
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Documentation structure and links are valid.');
}

main();
