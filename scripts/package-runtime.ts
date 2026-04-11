import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import archiver from 'archiver';

const ROOT = process.cwd();
const BUNDLE_NAME = 'e-dossier-runtime';
const ARTIFACT_ROOT = path.join(ROOT, '.artifacts', 'runtime');
const BUNDLE_DIR = path.join(ARTIFACT_ROOT, BUNDLE_NAME);
const ARCHIVE_PATH = path.join(ARTIFACT_ROOT, `${BUNDLE_NAME}.tar.gz`);
const CHECKSUM_PATH = `${ARCHIVE_PATH}.sha256`;

async function pathExists(targetPath: string) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function requirePath(targetPath: string, hint: string) {
  if (!(await pathExists(targetPath))) {
    throw new Error(`${targetPath} is missing. ${hint}`);
  }
}

async function copyIfPresent(sourcePath: string, destinationPath: string) {
  if (!(await pathExists(sourcePath))) return false;
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(sourcePath, destinationPath, { recursive: true });
  return true;
}

async function createArchive(sourceDir: string, archivePath: string) {
  await mkdir(path.dirname(archivePath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(archivePath);
    const archive = archiver('tar', {
      gzip: true,
      gzipOptions: { level: 9 },
    });

    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, path.basename(sourceDir));
    archive.finalize().catch(reject);
  });
}

async function main() {
  const standaloneDir = path.join(ROOT, '.next', 'standalone');
  const staticDir = path.join(ROOT, '.next', 'static');
  const publicDir = path.join(ROOT, 'public');
  const helpDocsDir = path.join(ROOT, 'docs', 'help');
  const envExamplePath = path.join(ROOT, '.env.production.example');
  const deployGuidePath = path.join(ROOT, 'docs', 'deploy', 'AIRGAP_RUNTIME_DEPLOYMENT.md');
  const packageJsonPath = path.join(ROOT, 'package.json');

  await requirePath(
    standaloneDir,
    'Run `pnpm run build:standalone` first. The build must use `output: "standalone"`.'
  );
  await requirePath(staticDir, 'Run `pnpm build` first so Next.js static assets are generated.');
  await requirePath(envExamplePath, 'The runtime bundle expects a production env template.');
  await requirePath(deployGuidePath, 'The runtime deployment guide must exist before packaging.');

  await rm(ARTIFACT_ROOT, { recursive: true, force: true });
  await mkdir(BUNDLE_DIR, { recursive: true });

  await cp(standaloneDir, BUNDLE_DIR, { recursive: true });
  for (const envFileName of [
    '.env',
    '.env.local',
    '.env.production',
    '.env.production.local',
    '.env.development',
    '.env.development.local',
    '.env.qa',
    '.env.qa.local',
  ]) {
    await rm(path.join(BUNDLE_DIR, envFileName), { force: true });
  }
  await cp(staticDir, path.join(BUNDLE_DIR, '.next', 'static'), { recursive: true });
  await copyIfPresent(publicDir, path.join(BUNDLE_DIR, 'public'));
  await copyIfPresent(helpDocsDir, path.join(BUNDLE_DIR, 'docs', 'help'));
  await cp(envExamplePath, path.join(BUNDLE_DIR, '.env.production.example'));
  await cp(deployGuidePath, path.join(BUNDLE_DIR, 'DEPLOYMENT_GUIDE.md'));

  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { name?: string; version?: string };
  const manifest = {
    name: pkg.name ?? 'e-dossier',
    version: pkg.version ?? '0.0.0',
    createdAt: new Date().toISOString(),
    entrypoint: 'server.js',
    bundledPaths: [
      '.next/standalone',
      '.next/static',
      'public',
      'docs/help',
      '.env.production.example',
      'DEPLOYMENT_GUIDE.md',
    ],
  };
  await writeFile(
    path.join(BUNDLE_DIR, 'runtime-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );

  await createArchive(BUNDLE_DIR, ARCHIVE_PATH);

  const archiveBuffer = await readFile(ARCHIVE_PATH);
  const checksum = createHash('sha256').update(archiveBuffer).digest('hex');
  await writeFile(CHECKSUM_PATH, `${checksum}  ${path.basename(ARCHIVE_PATH)}\n`, 'utf8');

  console.log(`Runtime bundle ready: ${path.relative(ROOT, ARCHIVE_PATH)}`);
  console.log(`Checksum written: ${path.relative(ROOT, CHECKSUM_PATH)}`);
  console.log(`Bundle directory: ${path.relative(ROOT, BUNDLE_DIR)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
