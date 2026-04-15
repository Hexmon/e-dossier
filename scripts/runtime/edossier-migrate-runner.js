#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    bundleDir: __dirname,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--bundle-dir') {
      const next = argv[i + 1];
      if (!next) fail('Missing value for --bundle-dir');
      args.bundleDir = path.resolve(next);
      i += 1;
      continue;
    }

    if (arg.startsWith('--bundle-dir=')) {
      args.bundleDir = path.resolve(arg.slice('--bundle-dir='.length));
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  return args;
}

function runPsql(args, capture = false) {
  const result = spawnSync(
    'psql',
    ['-v', 'ON_ERROR_STOP=1', '-d', process.env.DATABASE_URL, ...args],
    {
      encoding: 'utf8',
      stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    }
  );

  if (result.status !== 0) {
    if (capture) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  return capture ? result.stdout.trim() : '';
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) fail(`Missing required file: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJournal(bundleDir) {
  const journalPath = path.join(bundleDir, 'drizzle', 'meta', '_journal.json');
  const journal = readJson(journalPath);
  if (!Array.isArray(journal.entries) || journal.entries.length === 0) {
    fail(`No migration entries found in ${journalPath}`);
  }
  return journal.entries
    .map((entry) => {
      const createdAt = Number(entry.when);
      if (!Number.isFinite(createdAt)) {
        fail(`Invalid 'when' value in journal for ${entry.tag}: ${entry.when}`);
      }

      const sqlPath = path.join(bundleDir, 'drizzle', `${entry.tag}.sql`);
      if (!fs.existsSync(sqlPath)) {
        fail(`Missing migration SQL file: ${sqlPath}`);
      }

      return {
        tag: entry.tag,
        createdAt,
        sqlPath,
        hash: sha256(sqlPath),
      };
    })
    .sort((a, b) => a.createdAt - b.createdAt);
}

function ensureEnvironment() {
  if (!process.env.DATABASE_URL) {
    fail('DATABASE_URL must be exported before running the migration bundle.');
  }

  const versionCheck = spawnSync('psql', ['--version'], { encoding: 'utf8' });
  if (versionCheck.status !== 0) {
    fail('psql must be installed on VM1 before running offline migrations.');
  }
}

function ensureMigrationsTable() {
  runPsql([
    '-c',
    `create schema if not exists drizzle;
create table if not exists drizzle.__drizzle_migrations (
  id serial primary key,
  hash text not null,
  created_at bigint
)`,
  ]);
}

function getAppliedMigrations() {
  const output = runPsql(
    ['-At', '-F', '|', '-c', 'select created_at, hash from drizzle.__drizzle_migrations order by created_at'],
    true
  );
  const applied = new Map();
  if (!output) return applied;

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [createdAtRaw, hashRaw] = line.split('|');
    const createdAt = Number(createdAtRaw);
    if (!Number.isFinite(createdAt)) continue;
    applied.set(createdAt, hashRaw || '');
  }

  return applied;
}

function applyMigration(migration) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edossier-migrate-'));
  const tempSqlPath = path.join(tempDir, `${migration.tag}.sql`);
  const normalizedSqlPath = migration.sqlPath.replace(/\\/g, '/');

  fs.writeFileSync(
    tempSqlPath,
    [
      'begin;',
      `\\i ${normalizedSqlPath}`,
      `insert into drizzle.__drizzle_migrations (hash, created_at) values ('${migration.hash}', ${migration.createdAt});`,
      'commit;',
      '',
    ].join('\n'),
    'utf8'
  );

  try {
    runPsql(['-f', tempSqlPath]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundleDir = args.bundleDir;
  const manifestPath = path.join(bundleDir, 'release-manifest.json');
  const manifest = readJson(manifestPath);

  if (manifest.artifactType !== 'migrations') {
    fail(`Unexpected artifact type in ${manifestPath}: ${manifest.artifactType}`);
  }

  ensureEnvironment();
  ensureMigrationsTable();

  const migrations = readJournal(bundleDir);
  const applied = getAppliedMigrations();
  let appliedNow = 0;

  console.log(`Applying migration bundle for version ${manifest.version} (${manifest.gitSha || 'unknown'})`);
  for (const migration of migrations) {
    if (applied.has(migration.createdAt)) {
      const existingHash = applied.get(migration.createdAt);
      if (existingHash && existingHash !== migration.hash) {
        fail(
          `Migration journal mismatch for ${migration.tag}: database hash ${existingHash} does not match bundle hash ${migration.hash}`
        );
      }
      console.log(`- Skipping ${migration.tag}; already applied.`);
      continue;
    }

    console.log(`- Applying ${migration.tag}...`);
    applyMigration(migration);
    appliedNow += 1;
  }

  if (appliedNow === 0) {
    console.log('No pending migrations. Database is already up to date.');
    return;
  }

  console.log(`Applied ${appliedNow} migration(s) successfully.`);
}

main();
