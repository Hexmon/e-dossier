import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Client } from "pg";

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
  tag?: string;
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
  let tag: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg === "--list") {
      list = true;
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

  return { help, list, tag };
}

function printUsage() {
  console.log("Usage:");
  console.log("  pnpm run db:baseline -- --list");
  console.log("  pnpm run db:baseline -- --tag <migration_tag>");
  console.log("");
  console.log("Examples:");
  console.log("  pnpm run db:baseline -- --tag 0017_course_olq_templates");
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

  if (!args.tag) {
    printUsage();
    throw new Error("Missing required --tag. Baseline is explicit-only for safety.");
  }

  const targetEntry = sortedEntries.find((entry) => entry.tag === args.tag);
  if (!targetEntry) {
    throw new Error(
      `Tag '${args.tag}' not found in drizzle/meta/_journal.json. Run with --list to view valid tags.`
    );
  }

  const targetWhen = Number(targetEntry.when);
  const entriesToBaseline = sortedEntries.filter((entry) => Number(entry.when) <= targetWhen);
  if (!entriesToBaseline.length) {
    throw new Error(`No entries found to baseline for tag '${args.tag}'`);
  }

  const migrations = entriesToBaseline.map(toMigration);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("begin");

    await client.query(`create schema if not exists drizzle`);
    await client.query(`
      create table if not exists drizzle.__drizzle_migrations (
        id serial primary key,
        hash text not null,
        created_at bigint
      )
    `);

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
