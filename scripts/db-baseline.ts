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

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const journal = readJournal();
  if (!journal.entries.length) {
    throw new Error("No migration entries found in drizzle/meta/_journal.json");
  }

  // Baseline only the latest migration timestamp. This is enough to tell
  // Drizzle all old migrations are already applied, while preserving all data.
  const latestEntry = [...journal.entries]
    .sort((a, b) => Number(a.when) - Number(b.when))
    .at(-1);

  if (!latestEntry) {
    throw new Error("Could not resolve latest migration entry from journal");
  }

  const latestMigration = toMigration(latestEntry);

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
      [latestMigration.hash, latestMigration.createdAt]
    );

    await client.query("commit");

    if (insertResult.rowCount === 0) {
      console.log(
        `Baseline already present at created_at=${latestMigration.createdAt} (${latestMigration.tag}). No changes made.`
      );
      return;
    }

    console.log(
      `Baseline inserted for ${latestMigration.tag} (created_at=${latestMigration.createdAt}).`
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
