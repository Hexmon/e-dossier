import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Client } from "pg";
import { normalizeDatabaseUrl } from "../src/app/db/connectionString";

type JournalEntry = {
  tag: string;
  when: number | string;
};

type Journal = {
  entries: JournalEntry[];
};

type CliArgs = {
  help: boolean;
  list: boolean;
  repair: boolean;
  tag?: string;
};

type MigrationEntry = ReturnType<typeof toMigration>;

type InferResult = {
  inferredApplied: boolean;
  recognizedChecks: number;
  missingChecks: string[];
};

function readJournal(): Journal {
  const journalPath = path.join(process.cwd(), "drizzle", "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) {
    throw new Error(`Journal file not found: ${journalPath}`);
  }

  const raw = fs.readFileSync(journalPath, "utf8");
  return JSON.parse(raw) as Journal;
}

function toMigration(entry: JournalEntry) {
  const createdAt = Number(entry.when);
  if (!Number.isFinite(createdAt)) {
    throw new Error(`Invalid 'when' value in journal for ${entry.tag}: ${entry.when}`);
  }

  const sqlPath = path.join(process.cwd(), "drizzle", `${entry.tag}.sql`);
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Migration file not found: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");
  const hash = crypto.createHash("sha256").update(sql).digest("hex");

  return {
    tag: entry.tag,
    createdAt,
    hash,
  };
}

function parseArgs(argv: string[]): CliArgs {
  let help = false;
  let list = false;
  let repair = false;
  let tag: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg === "--list") {
      list = true;
      continue;
    }

    if (arg === "--repair") {
      repair = true;
      continue;
    }

    if (arg === "--tag") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        throw new Error("Missing value for --tag");
      }
      tag = next;
      i += 1;
      continue;
    }

    if (arg.startsWith("--tag=")) {
      const value = arg.slice("--tag=".length).trim();
      if (!value) {
        throw new Error("Missing value for --tag");
      }
      tag = value;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { help, list, repair, tag };
}

function printUsage() {
  console.log("Usage:");
  console.log("  pnpm run db:baseline -- --list");
  console.log("  pnpm run db:baseline -- --repair");
  console.log("  pnpm run db:baseline -- --tag <migration_tag>");
  console.log("");
  console.log("Examples:");
  console.log("  pnpm run db:baseline -- --repair");
  console.log("  pnpm run db:baseline -- --tag 0017_course_olq_templates");
}

async function ensureMigrationsTable(client: Client) {
  await client.query(`create schema if not exists drizzle`);
  await client.query(`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `);
}

async function getAppliedCreatedAtSet(client: Client) {
  const res = await client.query<{ created_at: string | number | null }>(
    `select created_at from drizzle.__drizzle_migrations`
  );
  const set = new Set<number>();
  for (const row of res.rows) {
    const n = Number(row.created_at);
    if (Number.isFinite(n)) set.add(n);
  }
  return set;
}

async function typeExists(client: Client, schema: string, typeName: string) {
  const res = await client.query(
    `select 1
       from pg_type t
       join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = $1 and t.typname = $2
      limit 1`,
    [schema, typeName]
  );
  return (res.rowCount ?? 0) > 0;
}

async function enumValueExists(client: Client, schema: string, typeName: string, enumLabel: string) {
  const res = await client.query(
    `select 1
       from pg_enum e
       join pg_type t on t.oid = e.enumtypid
       join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = $1 and t.typname = $2 and e.enumlabel = $3
      limit 1`,
    [schema, typeName, enumLabel]
  );
  return (res.rowCount ?? 0) > 0;
}

async function tableExists(client: Client, schema: string, tableName: string) {
  const qualified = `${schema}.${tableName}`;
  const res = await client.query<{ reg: string | null }>(
    `select to_regclass($1) as reg`,
    [qualified]
  );
  return Boolean(res.rows[0]?.reg);
}

async function columnExists(client: Client, schema: string, tableName: string, columnName: string) {
  const res = await client.query(
    `select 1
       from information_schema.columns
      where table_schema = $1 and table_name = $2 and column_name = $3
      limit 1`,
    [schema, tableName, columnName]
  );
  return (res.rowCount ?? 0) > 0;
}

async function indexExists(client: Client, schema: string, indexName: string) {
  const res = await client.query(
    `select 1
       from pg_indexes
      where schemaname = $1 and indexname = $2
      limit 1`,
    [schema, indexName]
  );
  return (res.rowCount ?? 0) > 0;
}

async function constraintExists(client: Client, schema: string, constraintName: string) {
  const res = await client.query(
    `select 1
       from pg_constraint c
       join pg_namespace n on n.oid = c.connamespace
      where n.nspname = $1 and c.conname = $2
      limit 1`,
    [schema, constraintName]
  );
  return (res.rowCount ?? 0) > 0;
}

function splitSqlStatements(sql: string) {
  return sql
    .split("--> statement-breakpoint")
    .map((stmt) => stmt.trim())
    .filter(Boolean);
}

async function inferMigrationApplied(client: Client, migration: MigrationEntry): Promise<InferResult> {
  const statements = splitSqlStatements(fs.readFileSync(path.join(process.cwd(), "drizzle", `${migration.tag}.sql`), "utf8"));
  let recognizedChecks = 0;
  const missingChecks: string[] = [];

  for (const statement of statements) {
    let match: RegExpMatchArray | null = null;

    match = statement.match(/^CREATE TYPE\s+"([^"]+)"\."([^"]+)"/i);
    if (match) {
      recognizedChecks += 1;
      const ok = await typeExists(client, match[1], match[2]);
      if (!ok) missingChecks.push(`type ${match[1]}.${match[2]}`);
      continue;
    }

    match = statement.match(/^ALTER TYPE\s+"([^"]+)"\."([^"]+)"\s+ADD VALUE\s+'([^']+)'/i);
    if (match) {
      recognizedChecks += 1;
      const ok = await enumValueExists(client, match[1], match[2], match[3]);
      if (!ok) missingChecks.push(`enum value ${match[1]}.${match[2]}.${match[3]}`);
      continue;
    }

    match = statement.match(/^CREATE TABLE\s+"([^"]+)"/i);
    if (match) {
      recognizedChecks += 1;
      const ok = await tableExists(client, "public", match[1]);
      if (!ok) missingChecks.push(`table public.${match[1]}`);
      continue;
    }

    match = statement.match(/^ALTER TABLE\s+"([^"]+)"\s+ADD COLUMN\s+"([^"]+)"/i);
    if (match) {
      recognizedChecks += 1;
      const ok = await columnExists(client, "public", match[1], match[2]);
      if (!ok) missingChecks.push(`column public.${match[1]}.${match[2]}`);
      continue;
    }

    match = statement.match(/^CREATE(?: UNIQUE)? INDEX\s+"([^"]+)"/i);
    if (match) {
      recognizedChecks += 1;
      const ok = await indexExists(client, "public", match[1]);
      if (!ok) missingChecks.push(`index public.${match[1]}`);
      continue;
    }

    match = statement.match(/^ALTER TABLE\s+"([^"]+)"\s+ADD CONSTRAINT\s+"([^"]+)"/i);
    if (match) {
      recognizedChecks += 1;
      const ok = await constraintExists(client, "public", match[2]);
      if (!ok) missingChecks.push(`constraint public.${match[2]}`);
      continue;
    }
  }

  return {
    inferredApplied: recognizedChecks > 0 && missingChecks.length === 0,
    recognizedChecks,
    missingChecks,
  };
}

async function insertMissingBaselineRows(client: Client, migrations: MigrationEntry[]) {
  let inserted = 0;
  for (const migration of migrations) {
    const insertResult = await client.query(
      `
      insert into drizzle.__drizzle_migrations (hash, created_at)
      select $1, $2
      where not exists (
        select 1
        from drizzle.__drizzle_migrations
        where created_at = $2
      )
      `,
      [migration.hash, migration.createdAt]
    );
    inserted += insertResult.rowCount ?? 0;
  }
  return inserted;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const journal = readJournal();
  if (!journal.entries.length) {
    throw new Error("No migration entries found in drizzle/meta/_journal.json");
  }

  const sortedEntries = [...journal.entries].sort((a, b) => Number(a.when) - Number(b.when));

  if (args.list) {
    const latestTag = sortedEntries.at(-1)?.tag;
    console.log("Available migration tags:");
    for (const entry of sortedEntries) {
      const marker = entry.tag === latestTag ? " (latest)" : "";
      console.log(`- ${entry.tag} (when=${entry.when})${marker}`);
    }
    return;
  }

  const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const runRepair = args.repair || (!args.tag && !args.list);

  if (runRepair) {
    try {
      await client.query("begin");
      await ensureMigrationsTable(client);
      const appliedCreatedAt = await getAppliedCreatedAtSet(client);
      const migrations = sortedEntries.map(toMigration);
      const pending = migrations.filter((migration) => !appliedCreatedAt.has(migration.createdAt));
      const inferredAppliedPending: MigrationEntry[] = [];

      for (const migration of pending) {
        const inferred = await inferMigrationApplied(client, migration);
        if (!inferred.inferredApplied) {
          break;
        }
        inferredAppliedPending.push(migration);
      }

      if (!inferredAppliedPending.length) {
        await client.query("rollback");
        console.log("No auto-repair baseline candidates found.");
        console.log("Use explicit mode if needed: pnpm run db:baseline -- --tag <migration_tag>");
        return;
      }

      const inserted = await insertMissingBaselineRows(client, inferredAppliedPending);
      await client.query("commit");

      const last = inferredAppliedPending.at(-1)!;
      console.log(`Auto-repair baseline completed up to ${last.tag}. Rows inserted: ${inserted}.`);
      console.log("You can now run: pnpm run db:migrate");
      return;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      await client.end();
    }
  }

  const targetEntry = sortedEntries.find((entry) => entry.tag === args.tag);
  if (!targetEntry) {
    await client.end();
    throw new Error(
      `Tag '${args.tag}' not found in drizzle/meta/_journal.json. Run with --list to view valid tags.`
    );
  }

  const targetWhen = Number(targetEntry.when);
  const entriesToBaseline = sortedEntries.filter((entry) => Number(entry.when) <= targetWhen);
  if (!entriesToBaseline.length) {
    await client.end();
    throw new Error(`No entries found to baseline for tag '${args.tag}'`);
  }

  const migrations = entriesToBaseline.map(toMigration);

  try {
    await client.query("begin");
    await ensureMigrationsTable(client);
    const inserted = await insertMissingBaselineRows(client, migrations);

    await client.query("commit");

    if (inserted === 0) {
      console.log(
        `Baseline already present up to ${targetEntry.tag} (created_at=${targetEntry.when}). No changes made.`
      );
      return;
    }

    console.log(
      `Baseline inserted/updated up to ${targetEntry.tag}. Rows inserted: ${inserted}.`
    );
    console.log("You can now run: pnpm run db:migrate");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`db:baseline failed: ${message}`);
  process.exit(1);
});
