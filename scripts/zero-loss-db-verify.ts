import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import { normalizeDatabaseUrl } from '../src/app/db/connectionString';

type Row = Record<string, string | number | boolean | null>;

type Args = {
  outDir: string;
  phase: 'pre' | 'post' | 'current';
  compareTo: string | null;
};

function parseArgs(): Args {
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const args = process.argv.slice(2);
  let outDir = path.join('.artifacts', 'oc-zero-loss', now);
  let phase: Args['phase'] = 'current';
  let compareTo: string | null = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--out') {
      outDir = args[++i] ?? outDir;
    } else if (arg === '--phase') {
      const value = args[++i];
      if (value !== 'pre' && value !== 'post' && value !== 'current') {
        throw new Error('--phase must be one of: pre, post, current');
      }
      phase = value;
    } else if (arg === '--compare-to') {
      compareTo = args[++i] ?? null;
    }
  }

  return { outDir, phase, compareTo };
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

async function writeCsv(filePath: string, rows: Row[]) {
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
  await fs.writeFile(filePath, `${csv}\n`);
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (quoted && char === '"' && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ',') {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

async function readCsv(filePath: string): Promise<Row[]> {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function byTable(rows: Row[]) {
  return new Map(rows.map((row) => [String(row.table_name), row]));
}

function qident(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function phasePrefix(phase: Args['phase']) {
  if (phase === 'pre') return 'pre-migration';
  if (phase === 'post') return 'post-migration';
  return 'current';
}

async function queryRows<T extends Row = Row>(client: Client, sql: string, params?: unknown[]) {
  const result = await client.query<T>(sql, params);
  return result.rows;
}

async function getOcRelatedTables(client: Client) {
  const rows = await queryRows<{ table_name: string }>(client, `
    with candidate_tables as (
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
        and table_name like 'oc_%'

      union

      select table_name
      from information_schema.columns
      where table_schema = 'public'
        and column_name in ('oc_id', 'enrollment_id')
    )
    select distinct table_name
    from candidate_tables
    order by table_name;
  `);
  return rows.map((row) => row.table_name);
}

async function tableHasColumn(client: Client, tableName: string, columnName: string) {
  const rows = await queryRows<{ exists: boolean }>(client, `
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
    ) as exists;
  `, [tableName, columnName]);
  return rows[0]?.exists ?? false;
}

async function collectCounts(client: Client, tables: string[]) {
  const rows: Row[] = [];
  for (const table of tables) {
    const result = await queryRows<{ count: string }>(
      client,
      `select count(*)::text as count from public.${qident(table)};`,
    );
    rows.push({ table_name: table, row_count: Number(result[0]?.count ?? 0) });
  }
  return rows;
}

async function collectChecksums(client: Client, tables: string[]) {
  const rows: Row[] = [];
  for (const table of tables) {
    const result = await queryRows<{ row_count: string; checksum: string }>(
      client,
      `
        select
          count(*)::text as row_count,
          coalesce(md5(string_agg(row_hash, '' order by row_hash)), md5('')) as checksum
        from (
          select md5(row_to_json(t)::text) as row_hash
          from public.${qident(table)} t
        ) s;
      `,
    );
    rows.push({
      table_name: table,
      row_count: Number(result[0]?.row_count ?? 0),
      checksum: result[0]?.checksum ?? '',
    });
  }
  return rows;
}

async function collectOrphanChecks(client: Client, tables: string[]) {
  const rows: Row[] = [];
  for (const table of tables) {
    if (table !== 'oc_cadets' && await tableHasColumn(client, table, 'oc_id')) {
      const result = await queryRows<{ orphan_count: string }>(
        client,
        `
          select count(*)::text as orphan_count
          from public.${qident(table)} t
          left join public.oc_cadets c on c.id = t.oc_id
          where t.oc_id is not null and c.id is null;
        `,
      );
      rows.push({
        table_name: table,
        reference_column: 'oc_id',
        referenced_table: 'oc_cadets',
        orphan_count: Number(result[0]?.orphan_count ?? 0),
      });
    }

    if (table !== 'oc_course_enrollments' && await tableHasColumn(client, table, 'enrollment_id')) {
      const result = await queryRows<{ orphan_count: string }>(
        client,
        `
          select count(*)::text as orphan_count
          from public.${qident(table)} t
          left join public.oc_course_enrollments e on e.id = t.enrollment_id
          where t.enrollment_id is not null and e.id is null;
        `,
      );
      rows.push({
        table_name: table,
        reference_column: 'enrollment_id',
        referenced_table: 'oc_course_enrollments',
        orphan_count: Number(result[0]?.orphan_count ?? 0),
      });
    }
  }
  return rows;
}

async function collectConflictChecks(client: Client) {
  return queryRows(client, `
    with active_enrollment_counts as (
      select c.id as oc_id, count(e.id)::int as active_enrollment_count
      from oc_cadets c
      left join oc_course_enrollments e
        on e.oc_id = c.id and e.status = 'ACTIVE'
      where c.deleted_at is null
      group by c.id
    ),
    checks as (
      select
        'active_oc_without_exactly_one_active_enrollment' as check_name,
        count(*)::int as issue_count
      from active_enrollment_counts
      where active_enrollment_count <> 1

      union all

      select
        'active_oc_missing_pre_commission',
        count(*)::int
      from oc_cadets c
      left join oc_pre_commission pc on pc.oc_id = c.id
      where c.deleted_at is null and pc.oc_id is null

      union all

      select
        'pre_commission_course_conflicts',
        count(*)::int
      from oc_cadets c
      join oc_pre_commission pc on pc.oc_id = c.id
      where c.deleted_at is null and c.course_id is distinct from pc.course_id

      union all

      select
        'pre_commission_branch_conflicts',
        count(*)::int
      from oc_cadets c
      join oc_pre_commission pc on pc.oc_id = c.id
      where c.deleted_at is null and c.branch is distinct from pc.branch

      union all

      select
        'pre_commission_platoon_conflicts',
        count(*)::int
      from oc_cadets c
      join oc_pre_commission pc on pc.oc_id = c.id
      where c.deleted_at is null and c.platoon_id is distinct from pc.platoon_id

      union all

      select
        'pre_commission_relegated_course_conflicts',
        count(*)::int
      from oc_cadets c
      join oc_pre_commission pc on pc.oc_id = c.id
      where c.deleted_at is null and c.relegated_to_course_id is distinct from pc.relegated_to_course_id

      union all

      select
        'pre_commission_relegated_on_conflicts',
        count(*)::int
      from oc_cadets c
      join oc_pre_commission pc on pc.oc_id = c.id
      where c.deleted_at is null and c.relegated_on is distinct from pc.relegated_on

      union all

      select
        'pre_commission_withdrawn_on_conflicts',
        count(*)::int
      from oc_cadets c
      join oc_pre_commission pc on pc.oc_id = c.id
      where c.deleted_at is null and c.withdrawn_on is distinct from pc.withdrawn_on

      union all

      select
        'active_enrollment_course_conflicts',
        count(*)::int
      from oc_cadets c
      join oc_course_enrollments e
        on e.oc_id = c.id and e.status = 'ACTIVE'
      where c.deleted_at is null and c.course_id is distinct from e.course_id

      union all

      select
        'active_enrollment_null_current_semester',
        count(*)::int
      from oc_cadets c
      join oc_course_enrollments e
        on e.oc_id = c.id and e.status = 'ACTIVE'
      where c.deleted_at is null and e.current_semester is null
    )
    select check_name, issue_count
    from checks
    order by check_name;
  `);
}

async function collectAuditRows(client: Client) {
  const exists = await queryRows<{ exists: boolean }>(client, `
    select to_regclass('public.oc_reconciliation_audit') is not null as exists;
  `);
  if (!exists[0]?.exists) {
    return [{
      conflict_type: 'TABLE_NOT_PRESENT',
      source_table: null,
      target_table: null,
      field_name: null,
      row_count: 0,
      first_created_at: null,
      last_created_at: null,
    }];
  }

  const rows = await queryRows(client, `
    select
      conflict_type,
      source_table,
      target_table,
      field_name,
      count(*)::int as row_count,
      min(created_at)::text as first_created_at,
      max(created_at)::text as last_created_at
    from oc_reconciliation_audit
    group by conflict_type, source_table, target_table, field_name
    order by conflict_type, source_table, target_table, field_name;
  `);
  return rows.length > 0
    ? rows
    : [{
      conflict_type: 'NO_AUDIT_ROWS',
      source_table: null,
      target_table: null,
      field_name: null,
      row_count: 0,
      first_created_at: null,
      last_created_at: null,
    }];
}

const ALLOWED_ROW_COUNT_INCREASE_TABLES = new Set([
  'oc_course_enrollments',
  'oc_pre_commission',
  'oc_reconciliation_audit',
]);

const ALLOWED_CHECKSUM_CHANGE_TABLES = new Set([
  'oc_course_enrollments',
  'oc_pre_commission',
  'oc_semester_marks',
  'oc_spr_records',
  'oc_discipline',
  'oc_motivation_awards',
  'oc_sports_and_games',
  'oc_weapon_training',
  'oc_camps',
  'oc_obstacle_training',
  'oc_speed_march',
  'oc_drill',
  'oc_olq',
  'oc_credit_for_excellence',
  'oc_clubs',
  'oc_special_achievement_in_clubs',
  'oc_recording_leave_hike_detention',
  'oc_counselling',
  'oc_interviews',
  'oc_pt_task_scores',
  'oc_pt_motivation_awards',
]);

async function compareWithPreviousRun(input: {
  compareTo: string;
  outDir: string;
  phase: Args['phase'];
  counts: Row[];
  checksums: Row[];
}) {
  const prePrefix = phasePrefix(input.phase === 'post' ? 'pre' : 'current');
  const currentPrefix = phasePrefix(input.phase);
  const previousCounts = byTable(await readCsv(path.join(input.compareTo, `${prePrefix}-counts.csv`)));
  const previousChecksums = byTable(await readCsv(path.join(input.compareTo, `${prePrefix}-checksums.csv`)));
  const currentCounts = byTable(input.counts);
  const currentChecksums = byTable(input.checksums);
  const tableNames = Array.from(new Set([
    ...previousCounts.keys(),
    ...currentCounts.keys(),
  ])).sort((left, right) => left.localeCompare(right));

  const rows = tableNames.map((tableName) => {
    const beforeCount = Number(previousCounts.get(tableName)?.row_count ?? 0);
    const afterCount = Number(currentCounts.get(tableName)?.row_count ?? 0);
    const beforeChecksum = String(previousChecksums.get(tableName)?.checksum ?? '');
    const afterChecksum = String(currentChecksums.get(tableName)?.checksum ?? '');
    const rowDelta = afterCount - beforeCount;
    const checksumChanged = beforeChecksum !== afterChecksum;
    const rowCountAllowed =
      rowDelta === 0 ||
      (rowDelta > 0 && ALLOWED_ROW_COUNT_INCREASE_TABLES.has(tableName));
    const checksumAllowed =
      !checksumChanged ||
      ALLOWED_CHECKSUM_CHANGE_TABLES.has(tableName) ||
      (rowDelta > 0 && ALLOWED_ROW_COUNT_INCREASE_TABLES.has(tableName));
    const passed = rowDelta >= 0 && rowCountAllowed && checksumAllowed;

    return {
      table_name: tableName,
      before_count: beforeCount,
      after_count: afterCount,
      row_delta: rowDelta,
      checksum_changed: checksumChanged,
      expected_change: passed,
      reason: rowDelta < 0
        ? 'row_count_decreased'
        : !rowCountAllowed
          ? 'unexpected_row_count_change'
          : !checksumAllowed
            ? 'unexpected_checksum_change'
            : 'ok',
    };
  });

  await writeCsv(path.join(input.outDir, `${currentPrefix}-diff.csv`), rows);
  return rows;
}

async function collectSummary(client: Client) {
  const rows = await queryRows(client, `
    select
      (select count(*)::int from oc_cadets where deleted_at is null) as active_oc_count,
      (select count(*)::int from oc_cadets) as total_oc_cadets,
      (
        select count(*)::int
        from (
          select c.id
          from oc_cadets c
          left join oc_course_enrollments e
            on e.oc_id = c.id and e.status = 'ACTIVE'
          where c.deleted_at is null
          group by c.id
          having count(e.id) <> 1
        ) s
      ) as active_oc_enrollment_cardinality_failures,
      (
        select count(*)::int
        from oc_cadets c
        left join oc_pre_commission pc on pc.oc_id = c.id
        where c.deleted_at is null and pc.oc_id is null
      ) as missing_pre_commission_rows,
      (select count(*)::int from oc_course_enrollments where status = 'ACTIVE') as active_enrollment_count,
      (
        select count(*)::int
        from oc_reconciliation_audit
      ) as reconciliation_audit_rows
    ;
  `);
  return rows[0] ?? {};
}

async function writeSummaryMarkdown(filePath: string, input: {
  phase: Args['phase'];
  generatedAt: string;
  tables: string[];
  summary: Row;
  conflictRows: Row[];
  orphanRows: Row[];
  auditRows: Row[];
}) {
  const conflictIssueCount = input.conflictRows.reduce((sum, row) => sum + Number(row.issue_count ?? 0), 0);
  const orphanIssueCount = input.orphanRows.reduce((sum, row) => sum + Number(row.orphan_count ?? 0), 0);
  const passed = conflictIssueCount === 0 && orphanIssueCount === 0;
  const lines = [
    '# OC Zero-Loss DB Verification Summary',
    '',
    `Generated at: ${input.generatedAt}`,
    `Phase: ${input.phase}`,
    `Tables checked: ${input.tables.length}`,
    '',
    '## Gate Result',
    '',
    passed ? 'PASS' : 'FAIL',
    '',
    '## Key Counts',
    '',
    `- Active OCs: ${input.summary.active_oc_count ?? 'n/a'}`,
    `- Total oc_cadets rows: ${input.summary.total_oc_cadets ?? 'n/a'}`,
    `- Active enrollment cardinality failures: ${input.summary.active_oc_enrollment_cardinality_failures ?? 'n/a'}`,
    `- Missing pre-commission rows: ${input.summary.missing_pre_commission_rows ?? 'n/a'}`,
    `- Active enrollments: ${input.summary.active_enrollment_count ?? 'n/a'}`,
    `- Reconciliation audit rows: ${input.summary.reconciliation_audit_rows ?? 'n/a'}`,
    `- Conflict issues: ${conflictIssueCount}`,
    `- Orphan issues: ${orphanIssueCount}`,
    '',
    '## Interpretation For Developers',
    '',
    '- `oc_cadets` is the canonical identity/current-placement table.',
    '- `oc_course_enrollments` is the canonical lifecycle/current-semester table.',
    '- `oc_pre_commission` is checked as a compatibility snapshot only.',
    '- Any non-zero conflict count means canonical and compatibility data drifted.',
    '- Any non-zero orphan count means a child record points at a missing OC/enrollment.',
    '- Audit rows are expected only when a pre-existing conflict had to be preserved before sync.',
    '',
    '## Evidence Files',
    '',
    `- ${phasePrefix(input.phase)}-counts.csv`,
    `- ${phasePrefix(input.phase)}-checksums.csv`,
    '- orphan-checks.csv',
    '- conflict-checks.csv',
    '- audit-rows.csv',
    '',
  ];

  if (input.auditRows.length > 0 && input.auditRows.some((row) => Number(row.row_count ?? 0) > 0)) {
    lines.push('## Audit Rows Present', '');
    for (const row of input.auditRows) {
      lines.push(`- ${row.conflict_type}/${row.field_name}: ${row.row_count}`);
    }
    lines.push('');
  }

  await fs.writeFile(filePath, `${lines.join('\n')}\n`);
}

async function main() {
  const { outDir, phase, compareTo } = parseArgs();
  const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!connectionString) throw new Error('DATABASE_URL is required.');

  await fs.mkdir(outDir, { recursive: true });

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const generatedAt = new Date().toISOString();
    const tables = await getOcRelatedTables(client);
    const counts = await collectCounts(client, tables);
    const checksums = await collectChecksums(client, tables);
    const orphanRows = await collectOrphanChecks(client, tables);
    const conflictRows = await collectConflictChecks(client);
    const auditRows = await collectAuditRows(client);
    const summary = await collectSummary(client);

    await writeCsv(path.join(outDir, `${phasePrefix(phase)}-counts.csv`), counts);
    await writeCsv(path.join(outDir, `${phasePrefix(phase)}-checksums.csv`), checksums);
    await writeCsv(path.join(outDir, 'orphan-checks.csv'), orphanRows);
    await writeCsv(path.join(outDir, 'conflict-checks.csv'), conflictRows);
    await writeCsv(path.join(outDir, 'audit-rows.csv'), auditRows);
    await writeSummaryMarkdown(path.join(outDir, 'db-verification-summary.md'), {
      phase,
      generatedAt,
      tables,
      summary,
      conflictRows,
      orphanRows,
      auditRows,
    });

    const diffRows = compareTo
      ? await compareWithPreviousRun({ compareTo, outDir, phase, counts, checksums })
      : [];

    await client.query('COMMIT');

    const conflictIssueCount = conflictRows.reduce((sum, row) => sum + Number(row.issue_count ?? 0), 0);
    const orphanIssueCount = orphanRows.reduce((sum, row) => sum + Number(row.orphan_count ?? 0), 0);
    const unexpectedDiffCount = diffRows.filter((row) => row.expected_change !== true).length;
    console.log(`OC zero-loss DB verification written to ${outDir}`);
    console.log(`Active OCs: ${summary.active_oc_count}`);
    console.log(`Missing/precondition issues: conflicts=${conflictIssueCount}, orphans=${orphanIssueCount}, unexpectedDiffs=${unexpectedDiffCount}`);
    if (conflictIssueCount > 0 || orphanIssueCount > 0 || unexpectedDiffCount > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
