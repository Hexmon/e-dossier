import { sql } from 'drizzle-orm';
import { db } from '@/app/db/client';

type DbExecuteResult<T> = { rows?: T[] } | T[];
type Row = Record<string, unknown>;

export type OcDataHealthCheck = {
  checkName: string;
  issueCount: number;
};

export type OcDataHealthOrphanCheck = {
  tableName: string;
  referenceColumn: 'oc_id' | 'enrollment_id';
  referencedTable: 'oc_cadets' | 'oc_course_enrollments';
  orphanCount: number;
};

export type OcDataHealthAuditSummary = {
  conflictType: string;
  sourceTable: string | null;
  targetTable: string | null;
  fieldName: string | null;
  rowCount: number;
  firstCreatedAt: string | null;
  lastCreatedAt: string | null;
};

export type OcDataHealthSummary = {
  generatedAt: string;
  gatePassed: boolean;
  activeOcCount: number;
  totalOcCadets: number;
  activeEnrollmentCount: number;
  activeEnrollmentCardinalityFailures: number;
  missingPreCommissionRows: number;
  conflictIssueCount: number;
  orphanIssueCount: number;
  reconciliationAuditRows: number;
  checks: OcDataHealthCheck[];
  orphanChecks: OcDataHealthOrphanCheck[];
  auditRows: OcDataHealthAuditSummary[];
};

function rowsOf<T>(result: DbExecuteResult<T>): T[] {
  return Array.isArray(result) ? result : result.rows ?? [];
}

function numberValue(value: unknown): number {
  return Number(value ?? 0);
}

function qident(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function rawRows<T extends Row = Row>(query: string) {
  return rowsOf<T>(await db.execute(sql.raw(query)) as DbExecuteResult<T>);
}

async function getOcRelatedTables() {
  const rows = await rawRows<{ table_name: string }>(`
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

async function tableHasColumn(tableName: string, columnName: string) {
  const rows = await rowsOf<{ exists: boolean }>(
    await db.execute(sql`
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = ${tableName}
          and column_name = ${columnName}
      ) as exists;
    `) as DbExecuteResult<{ exists: boolean }>,
  );
  return rows[0]?.exists ?? false;
}

async function collectOrphanChecks(tables: string[]): Promise<OcDataHealthOrphanCheck[]> {
  const rows: OcDataHealthOrphanCheck[] = [];

  for (const table of tables) {
    if (table !== 'oc_cadets' && await tableHasColumn(table, 'oc_id')) {
      const [result] = await rawRows<{ orphan_count: string }>(`
        select count(*)::text as orphan_count
        from public.${qident(table)} t
        left join public.oc_cadets c on c.id = t.oc_id
        where t.oc_id is not null and c.id is null;
      `);
      rows.push({
        tableName: table,
        referenceColumn: 'oc_id',
        referencedTable: 'oc_cadets',
        orphanCount: numberValue(result?.orphan_count),
      });
    }

    if (table !== 'oc_course_enrollments' && await tableHasColumn(table, 'enrollment_id')) {
      const [result] = await rawRows<{ orphan_count: string }>(`
        select count(*)::text as orphan_count
        from public.${qident(table)} t
        left join public.oc_course_enrollments e on e.id = t.enrollment_id
        where t.enrollment_id is not null and e.id is null;
      `);
      rows.push({
        tableName: table,
        referenceColumn: 'enrollment_id',
        referencedTable: 'oc_course_enrollments',
        orphanCount: numberValue(result?.orphan_count),
      });
    }
  }

  return rows;
}

async function collectChecks(): Promise<OcDataHealthCheck[]> {
  const rows = await rawRows<{ check_name: string; issue_count: string | number }>(`
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

  return rows.map((row) => ({
    checkName: row.check_name,
    issueCount: numberValue(row.issue_count),
  }));
}

async function collectAuditRows(): Promise<OcDataHealthAuditSummary[]> {
  const exists = await rawRows<{ exists: boolean }>(`
    select to_regclass('public.oc_reconciliation_audit') is not null as exists;
  `);

  if (!exists[0]?.exists) {
    return [{
      conflictType: 'TABLE_NOT_PRESENT',
      sourceTable: null,
      targetTable: null,
      fieldName: null,
      rowCount: 0,
      firstCreatedAt: null,
      lastCreatedAt: null,
    }];
  }

  const rows = await rawRows<{
    conflict_type: string;
    source_table: string | null;
    target_table: string | null;
    field_name: string | null;
    row_count: string | number;
    first_created_at: string | null;
    last_created_at: string | null;
  }>(`
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

  return rows.map((row) => ({
    conflictType: row.conflict_type,
    sourceTable: row.source_table,
    targetTable: row.target_table,
    fieldName: row.field_name,
    rowCount: numberValue(row.row_count),
    firstCreatedAt: row.first_created_at,
    lastCreatedAt: row.last_created_at,
  }));
}

export async function getOcDataHealth(): Promise<OcDataHealthSummary> {
  const [summary] = await rawRows<{
    active_oc_count: string | number;
    total_oc_cadets: string | number;
    active_oc_enrollment_cardinality_failures: string | number;
    missing_pre_commission_rows: string | number;
    active_enrollment_count: string | number;
    reconciliation_audit_rows: string | number;
  }>(`
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
      (select count(*)::int from oc_reconciliation_audit) as reconciliation_audit_rows;
  `);

  const tables = await getOcRelatedTables();
  const [checks, orphanChecks, auditRows] = await Promise.all([
    collectChecks(),
    collectOrphanChecks(tables),
    collectAuditRows(),
  ]);

  const conflictIssueCount = checks.reduce((sum, row) => sum + row.issueCount, 0);
  const orphanIssueCount = orphanChecks.reduce((sum, row) => sum + row.orphanCount, 0);

  return {
    generatedAt: new Date().toISOString(),
    gatePassed: conflictIssueCount === 0 && orphanIssueCount === 0,
    activeOcCount: numberValue(summary?.active_oc_count),
    totalOcCadets: numberValue(summary?.total_oc_cadets),
    activeEnrollmentCount: numberValue(summary?.active_enrollment_count),
    activeEnrollmentCardinalityFailures: numberValue(summary?.active_oc_enrollment_cardinality_failures),
    missingPreCommissionRows: numberValue(summary?.missing_pre_commission_rows),
    conflictIssueCount,
    orphanIssueCount,
    reconciliationAuditRows: numberValue(summary?.reconciliation_audit_rows),
    checks,
    orphanChecks,
    auditRows,
  };
}
