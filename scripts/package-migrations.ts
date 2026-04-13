import { cp, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  ROOT,
  createArchive,
  prepareCleanDir,
  readBuildMetadata,
  requirePath,
  writeJson,
  writeSha256File,
} from './lib/airgap-artifacts';

type JournalEntry = {
  tag: string;
  when: number | string;
};

type Journal = {
  version?: string;
  dialect?: string;
  entries: JournalEntry[];
};

async function main() {
  const build = await readBuildMetadata();
  const artifactName = `e-dossier-migrations-${build.version}`;
  const artifactRoot = path.join(ROOT, '.artifacts', 'airgap', 'migrations');
  const bundleDir = path.join(artifactRoot, artifactName);
  const archivePath = path.join(artifactRoot, `${artifactName}.tar.gz`);
  const journalPath = path.join(ROOT, 'drizzle', 'meta', '_journal.json');
  const runnerPath = path.join(ROOT, 'scripts', 'runtime', 'edossier-migrate-runner.js');
  const guidePath = path.join(ROOT, 'docs', 'deploy', 'AIRGAP_SCHEMA_RELEASE.md');

  await requirePath(journalPath, 'The migration bundle expects drizzle/meta/_journal.json to exist.');
  await requirePath(runnerPath, 'The migration bundle requires an offline migration runner.');
  await requirePath(guidePath, 'The migration bundle should ship with the schema-release guide.');

  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as Journal;
  if (!journal.entries.length) {
    throw new Error('No migration entries found in drizzle/meta/_journal.json');
  }

  const sortedEntries = [...journal.entries].sort((a, b) => Number(a.when) - Number(b.when));
  await prepareCleanDir(bundleDir);
  await mkdir(path.join(bundleDir, 'drizzle', 'meta'), { recursive: true });

  await cp(journalPath, path.join(bundleDir, 'drizzle', 'meta', '_journal.json'));
  for (const entry of sortedEntries) {
    const sqlPath = path.join(ROOT, 'drizzle', `${entry.tag}.sql`);
    await requirePath(sqlPath, `The migration bundle is missing SQL for ${entry.tag}.`);
    await cp(sqlPath, path.join(bundleDir, 'drizzle', `${entry.tag}.sql`));
  }

  await cp(runnerPath, path.join(bundleDir, 'migrate.js'));
  await cp(guidePath, path.join(bundleDir, 'MIGRATION_GUIDE.md'));

  const manifest = {
    artifactType: 'migrations',
    name: build.name,
    version: build.version,
    gitSha: build.gitSha,
    createdAt: build.createdAt,
    nodeRange: build.nodeRange,
    requiredNodeMajor: build.requiredNodeMajor,
    runner: 'migrate.js',
    migrationCount: sortedEntries.length,
    latestTag: sortedEntries.at(-1)?.tag ?? 'unknown',
    journalVersion: journal.version ?? 'unknown',
    dialect: journal.dialect ?? 'postgresql',
    bundledPaths: [
      'drizzle/*.sql',
      'drizzle/meta/_journal.json',
      'migrate.js',
      'MIGRATION_GUIDE.md',
    ],
  };

  await writeJson(path.join(bundleDir, 'release-manifest.json'), manifest);
  await createArchive(bundleDir, archivePath);
  const checksumPath = await writeSha256File(archivePath);

  console.log(`Migration bundle ready: ${path.relative(ROOT, archivePath)}`);
  console.log(`Checksum written: ${path.relative(ROOT, checksumPath)}`);
  console.log(`Bundle directory: ${path.relative(ROOT, bundleDir)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
