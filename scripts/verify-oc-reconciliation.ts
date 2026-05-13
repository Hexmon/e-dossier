import 'dotenv/config';
import { Client } from 'pg';
import { normalizeDatabaseUrl } from '../src/app/db/connectionString';

async function printTable(client: Client, title: string, query: string) {
  const result = await client.query(query);
  console.log(`\n## ${title}`);
  console.table(result.rows);
}

async function main() {
  const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN READ ONLY');

    await printTable(client, 'OC reconciliation summary', `
      select
        count(*)::int as total_active_ocs,
        count(*) filter (where e.oc_id is null)::int as missing_active_enrollments,
        count(*) filter (where pc.oc_id is null)::int as missing_pre_commission_rows
      from oc_cadets c
      left join oc_course_enrollments e
        on e.oc_id = c.id and e.status = 'ACTIVE'
      left join oc_pre_commission pc
        on pc.oc_id = c.id
      where c.deleted_at is null;
    `);

    await printTable(client, 'Pre-commission conflicts', `
      select
        count(*) filter (where c.course_id is distinct from pc.course_id)::int as course_conflicts,
        count(*) filter (where c.branch is distinct from pc.branch)::int as branch_conflicts,
        count(*) filter (where c.platoon_id is distinct from pc.platoon_id)::int as platoon_conflicts,
        count(*) filter (where c.relegated_to_course_id is distinct from pc.relegated_to_course_id)::int as relegated_course_conflicts,
        count(*) filter (where c.relegated_on is distinct from pc.relegated_on)::int as relegated_on_conflicts,
        count(*) filter (where c.withdrawn_on is distinct from pc.withdrawn_on)::int as withdrawn_on_conflicts
      from oc_cadets c
      join oc_pre_commission pc on pc.oc_id = c.id
      where c.deleted_at is null;
    `);

    await printTable(client, 'Active enrollment conflicts', `
      select
        count(*)::int as active_enrollments,
        count(*) filter (where c.course_id is distinct from e.course_id)::int as course_conflicts,
        count(*) filter (where e.current_semester is null)::int as null_current_semester
      from oc_cadets c
      join oc_course_enrollments e
        on e.oc_id = c.id and e.status = 'ACTIVE'
      where c.deleted_at is null;
    `);

    const auditTable = await client.query<{ exists: boolean }>(`
      select to_regclass('public.oc_reconciliation_audit') is not null as exists;
    `);

    if (auditTable.rows[0]?.exists) {
      await printTable(client, 'Reconciliation audit rows', `
        select
          conflict_type,
          source_table,
          target_table,
          count(*)::int as rows
        from oc_reconciliation_audit
        group by conflict_type, source_table, target_table
        order by rows desc, conflict_type;
      `);
    } else {
      console.log('\n## Reconciliation audit rows');
      console.log('oc_reconciliation_audit table is not present yet.');
    }

    await client.query('COMMIT');
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
