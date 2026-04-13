import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  ROOT,
  copyIfPresent,
  createArchive,
  prepareCleanDir,
  readBuildMetadata,
  requirePath,
  writeJson,
  writeSha256File,
} from './lib/airgap-artifacts';

async function main() {
  const build = await readBuildMetadata();
  const bundleName = `e-dossier-app-${build.version}`;
  const artifactRoot = path.join(ROOT, '.artifacts', 'airgap', 'app');
  const bundleDir = path.join(artifactRoot, bundleName);
  const archivePath = path.join(artifactRoot, `${bundleName}.tar.gz`);
  const standaloneDir = path.join(ROOT, '.next', 'standalone');
  const staticDir = path.join(ROOT, '.next', 'static');
  const publicDir = path.join(ROOT, 'public');
  const helpDocsDir = path.join(ROOT, 'docs', 'help');
  const envExamplePath = path.join(ROOT, '.env.production.example');
  const deployGuidePath = path.join(ROOT, 'docs', 'deploy', 'AIRGAP_RUNTIME_DEPLOYMENT.md');
  const bootstrapGuidePath = path.join(ROOT, 'docs', 'deploy', 'AIRGAP_VM1_BOOTSTRAP.md');
  const schemaGuidePath = path.join(ROOT, 'docs', 'deploy', 'AIRGAP_SCHEMA_RELEASE.md');

  await requirePath(
    standaloneDir,
    'Run `pnpm run build:standalone` first. The app bundle must use `output: "standalone"`.'
  );
  await requirePath(staticDir, 'Run `pnpm build` first so Next.js static assets are generated.');
  await requirePath(envExamplePath, 'The runtime bundle expects a production env template.');
  await requirePath(deployGuidePath, 'The runtime deployment guide must exist before packaging.');
  await requirePath(bootstrapGuidePath, 'The runtime bundle should ship with the VM1 bootstrap guide.');
  await requirePath(schemaGuidePath, 'The runtime bundle should ship with the schema-release guide.');

  await prepareCleanDir(bundleDir);

  await cp(standaloneDir, bundleDir, { recursive: true });
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
    await rm(path.join(bundleDir, envFileName), { force: true });
  }
  await cp(staticDir, path.join(bundleDir, '.next', 'static'), { recursive: true });
  await copyIfPresent(publicDir, path.join(bundleDir, 'public'));
  await copyIfPresent(helpDocsDir, path.join(bundleDir, 'docs', 'help'));
  await cp(envExamplePath, path.join(bundleDir, '.env.production.example'));
  await cp(deployGuidePath, path.join(bundleDir, 'DEPLOYMENT_GUIDE.md'));
  await cp(bootstrapGuidePath, path.join(bundleDir, 'AIRGAP_VM1_BOOTSTRAP.md'));
  await cp(schemaGuidePath, path.join(bundleDir, 'AIRGAP_SCHEMA_RELEASE.md'));

  const manifest = {
    artifactType: 'app',
    name: build.name,
    version: build.version,
    gitSha: build.gitSha,
    createdAt: build.createdAt,
    nodeRange: build.nodeRange,
    requiredNodeMajor: build.requiredNodeMajor,
    entrypoint: 'server.js',
    bundledPaths: [
      '.next/standalone',
      '.next/static',
      'public',
      'docs/help',
      '.env.production.example',
      'DEPLOYMENT_GUIDE.md',
      'AIRGAP_VM1_BOOTSTRAP.md',
      'AIRGAP_SCHEMA_RELEASE.md',
    ],
  };
  const deployMetadata = {
    serviceName: 'edossier-app.service',
    entrypoint: 'server.js',
    envLinkName: '.env',
    sharedEnvFile: '/opt/edossier/shared/app.env',
    healthcheckPath: '/api/v1/health',
    healthcheckUrl: 'http://127.0.0.1:3000/api/v1/health',
    releaseRetention: 3,
  };

  await writeJson(path.join(bundleDir, 'release-manifest.json'), manifest);
  await writeJson(path.join(bundleDir, 'deploy-metadata.json'), deployMetadata);

  await createArchive(bundleDir, archivePath);
  const checksumPath = await writeSha256File(archivePath);

  console.log(`App bundle ready: ${path.relative(ROOT, archivePath)}`);
  console.log(`Checksum written: ${path.relative(ROOT, checksumPath)}`);
  console.log(`Bundle directory: ${path.relative(ROOT, bundleDir)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
