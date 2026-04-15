import "dotenv/config";
import { Client } from "pg";
import { normalizeDatabaseUrl } from "../src/app/db/connectionString";

type Args = {
  help: boolean;
  dryRun: boolean;
  apply: boolean;
  courseId?: string;
  semester?: number;
  includeZeroCredits: boolean;
};

type CandidateRow = {
  id: string;
  courseId: string;
  semester: number;
  subjectCode: string;
  subjectName: string;
  includeTheory: boolean;
  includePractical: boolean;
  theoryCredits: number | null;
  practicalCredits: number | null;
  hasTheory: boolean;
  hasPractical: boolean;
  defaultTheoryCredits: number | null;
  defaultPracticalCredits: number | null;
  nextIncludeTheory: boolean;
  nextIncludePractical: boolean;
  nextTheoryCredits: number | null;
  nextPracticalCredits: number | null;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    help: false,
    dryRun: true,
    apply: false,
    includeZeroCredits: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    if (arg === "--apply") {
      args.apply = true;
      args.dryRun = false;
      continue;
    }

    if (arg === "--dry-run") {
      args.dryRun = true;
      args.apply = false;
      continue;
    }

    if (arg === "--include-zero-credits") {
      args.includeZeroCredits = true;
      continue;
    }

    if (arg.startsWith("--course-id=")) {
      args.courseId = arg.slice("--course-id=".length).trim();
      continue;
    }

    if (arg.startsWith("--semester=")) {
      const value = Number(arg.slice("--semester=".length));
      if (!Number.isInteger(value) || value < 1 || value > 8) {
        throw new Error(`Invalid semester value "${arg}". Expected 1-8.`);
      }
      args.semester = value;
      continue;
    }

    throw new Error(
      `Unknown argument "${arg}". Supported: --dry-run --apply --course-id=<uuid> --semester=<1-8> --include-zero-credits`
    );
  }

  return args;
}

function printHelp() {
  console.log("Repair course offering credits from subject defaults.");
  console.log("");
  console.log("This script only updates course_offerings rows.");
  console.log("By default it repairs rows with NULL credits or disabled include flags that do not match the subject.");
  console.log("It will NOT touch explicit zero-credit rows unless you pass --include-zero-credits.");
  console.log("");
  console.log("Examples:");
  console.log("  pnpm run db:repair:course-offering-credits");
  console.log("  pnpm run db:repair:course-offering-credits -- --course-id=<uuid> --semester=1");
  console.log("  pnpm run db:repair:course-offering-credits -- --apply --course-id=<uuid>");
  console.log("  pnpm run db:repair:course-offering-credits -- --apply --include-zero-credits --course-id=<uuid>");
}

function summarizeChange(row: CandidateRow): string[] {
  const changes: string[] = [];

  if (row.includeTheory !== row.nextIncludeTheory) {
    changes.push(`include_theory ${row.includeTheory} -> ${row.nextIncludeTheory}`);
  }
  if (row.includePractical !== row.nextIncludePractical) {
    changes.push(`include_practical ${row.includePractical} -> ${row.nextIncludePractical}`);
  }
  if (row.theoryCredits !== row.nextTheoryCredits) {
    changes.push(`theory_credits ${row.theoryCredits ?? "null"} -> ${row.nextTheoryCredits ?? "null"}`);
  }
  if (row.practicalCredits !== row.nextPracticalCredits) {
    changes.push(`practical_credits ${row.practicalCredits ?? "null"} -> ${row.nextPracticalCredits ?? "null"}`);
  }

  return changes;
}

async function loadCandidates(client: Client, args: Args): Promise<CandidateRow[]> {
  const params: Array<string | number | boolean> = [args.includeZeroCredits];
  const filters: string[] = [];

  if (args.courseId) {
    params.push(args.courseId);
    filters.push(`co.course_id = $${params.length}`);
  }

  if (args.semester !== undefined) {
    params.push(args.semester);
    filters.push(`co.semester = $${params.length}`);
  }

  const whereFilter = filters.length ? `and ${filters.join(" and ")}` : "";

  const result = await client.query<CandidateRow>(
    `
      with candidates as (
        select
          co.id,
          co.course_id as "courseId",
          co.semester,
          s.code as "subjectCode",
          s.name as "subjectName",
          co.include_theory as "includeTheory",
          co.include_practical as "includePractical",
          co.theory_credits as "theoryCredits",
          co.practical_credits as "practicalCredits",
          s.has_theory as "hasTheory",
          s.has_practical as "hasPractical",
          s.default_theory_credits as "defaultTheoryCredits",
          s.default_practical_credits as "defaultPracticalCredits",
          case
            when s.has_theory = false then false
            when co.include_theory = true then true
            when co.theory_credits is null then true
            when $1::boolean = true and co.theory_credits = 0 and s.default_theory_credits is not null and s.default_theory_credits > 0 then true
            else co.include_theory
          end as "nextIncludeTheory",
          case
            when s.has_practical = false then false
            when co.include_practical = true then true
            when co.practical_credits is null then true
            when $1::boolean = true and co.practical_credits = 0 and s.default_practical_credits is not null and s.default_practical_credits > 0 then true
            else co.include_practical
          end as "nextIncludePractical",
          case
            when s.has_theory = false then null
            when co.theory_credits is null then s.default_theory_credits
            when $1::boolean = true and co.theory_credits = 0 and s.default_theory_credits is not null and s.default_theory_credits > 0 then s.default_theory_credits
            else co.theory_credits
          end as "nextTheoryCredits",
          case
            when s.has_practical = false then null
            when co.practical_credits is null then s.default_practical_credits
            when $1::boolean = true and co.practical_credits = 0 and s.default_practical_credits is not null and s.default_practical_credits > 0 then s.default_practical_credits
            else co.practical_credits
          end as "nextPracticalCredits"
        from course_offerings co
        inner join subjects s on s.id = co.subject_id
        where co.deleted_at is null
          and s.deleted_at is null
          ${whereFilter}
      )
      select *
      from candidates
      where "includeTheory" is distinct from "nextIncludeTheory"
         or "includePractical" is distinct from "nextIncludePractical"
         or "theoryCredits" is distinct from "nextTheoryCredits"
         or "practicalCredits" is distinct from "nextPracticalCredits"
      order by "courseId", semester, "subjectCode"
    `,
    params
  );

  return result.rows;
}

async function applyCandidates(client: Client, rows: CandidateRow[]) {
  let updated = 0;

  for (const row of rows) {
    const result = await client.query(
      `
        update course_offerings
        set
          include_theory = $2,
          include_practical = $3,
          theory_credits = $4,
          practical_credits = $5,
          updated_at = now()
        where id = $1
      `,
      [
        row.id,
        row.nextIncludeTheory,
        row.nextIncludePractical,
        row.nextTheoryCredits,
        row.nextPracticalCredits,
      ]
    );

    updated += result.rowCount ?? 0;
  }

  return updated;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("begin");

    const candidates = await loadCandidates(client, args);
    console.log(
      `[course-offering-credits] mode=${args.dryRun ? "dry-run" : "apply"} candidates=${candidates.length} includeZeroCredits=${args.includeZeroCredits}`
    );

    if (!candidates.length) {
      await client.query("rollback");
      console.log("No course offering rows need credit backfill.");
      return;
    }

    for (const row of candidates.slice(0, 25)) {
      console.log(
        `${row.courseId} sem=${row.semester} ${row.subjectCode} (${row.subjectName}) :: ${summarizeChange(row).join(", ")}`
      );
    }

    if (candidates.length > 25) {
      console.log(`... ${candidates.length - 25} more candidate rows not shown`);
    }

    if (args.dryRun) {
      await client.query("rollback");
      console.log("Dry-run completed. No rows were updated.");
      return;
    }

    const updated = await applyCandidates(client, candidates);
    await client.query("commit");
    console.log(`Backfill completed. Updated rows: ${updated}.`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`db:repair:course-offering-credits failed: ${message}`);
  process.exit(1);
});
