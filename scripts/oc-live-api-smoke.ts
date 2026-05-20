import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import { signAccessJWT } from '../src/app/lib/jwt';
import { normalizeDatabaseUrl } from '../src/app/db/connectionString';
import { OC_SMOKE_OC_NO_PREFIXES } from './oc-smoke-data';

type SmokeRow = {
  step: string;
  method: string;
  path: string;
  status: number | null;
  ok: boolean;
  detail: string;
};

type RuntimeTargets = {
  courseId: string;
  courseCode: string;
  platoonId: string | null;
  platoonLabel: string | null;
  existingOcId: string;
};

type Session = {
  userId: string;
  roles: string[];
  apt: {
    id: string;
    position: string;
    scope: { type: string; id: string | null };
    valid_from: string | null;
    valid_to: string | null;
    auth_kind: 'APPOINTMENT';
    source_appointment_id: string;
  };
};

type Args = {
  outDir: string;
  baseUrl: string;
  mutate: boolean;
  keepSmokeOcs: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  let outDir = path.join('.artifacts', 'oc-zero-loss', now);
  let baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
  let mutate = false;
  let keepSmokeOcs = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--out') {
      outDir = args[++i] ?? outDir;
    } else if (arg === '--base-url') {
      baseUrl = args[++i] ?? baseUrl;
    } else if (arg === '--mutate') {
      mutate = true;
    } else if (arg === '--keep-smoke-ocs') {
      keepSmokeOcs = true;
    }
  }

  return { outDir, baseUrl: baseUrl.replace(/\/$/, ''), mutate, keepSmokeOcs };
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

async function writeCsv(filePath: string, rows: SmokeRow[]) {
  const headers = ['step', 'method', 'path', 'status', 'ok', 'detail'];
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header as keyof SmokeRow])).join(',')),
  ].join('\n');
  await fs.writeFile(filePath, `${csv}\n`);
}

async function withDb<T>(fn: (client: Client) => Promise<T>) {
  const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!connectionString) throw new Error('DATABASE_URL is required.');

  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function loadSession(client: Client): Promise<Session> {
  const result = await client.query<{
    appointment_id: string;
    user_id: string;
    position_key: string;
    scope_type: string;
    scope_id: string | null;
    starts_at: Date;
    ends_at: Date | null;
  }>(`
    select
      a.id as appointment_id,
      a.user_id,
      p.key as position_key,
      a.scope_type,
      a.scope_id,
      a.starts_at,
      a.ends_at
    from appointments a
    join positions p on p.id = a.position_id
    join users u on u.id = a.user_id
    where a.deleted_at is null
      and u.deleted_at is null
      and u.is_active = true
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
      and p.key in ('SUPER_ADMIN', 'ADMIN')
    order by case when p.key = 'SUPER_ADMIN' then 0 else 1 end, a.created_at asc
    limit 1;
  `);

  const row = result.rows[0];
  if (!row) throw new Error('No active SUPER_ADMIN or ADMIN appointment found for live API smoke.');

  return {
    userId: row.user_id,
    roles: [row.position_key],
    apt: {
      id: row.appointment_id,
      position: row.position_key,
      scope: { type: row.scope_type, id: row.scope_id },
      valid_from: row.starts_at?.toISOString?.() ?? null,
      valid_to: row.ends_at?.toISOString?.() ?? null,
      auth_kind: 'APPOINTMENT',
      source_appointment_id: row.appointment_id,
    },
  };
}

async function loadRuntimeTargets(client: Client): Promise<RuntimeTargets> {
  const courseResult = await client.query<{ id: string; code: string }>(`
    select id, code
    from courses
    where deleted_at is null
    order by created_at asc nulls last, id asc
    limit 1;
  `);
  const platoonResult = await client.query<{ id: string; label: string }>(`
    select id, coalesce(name, key) as label
    from platoons
    where deleted_at is null
    order by created_at asc nulls last, id asc
    limit 1;
  `);
  const ocResult = await client.query<{ id: string }>(`
    select id
    from oc_cadets
    where deleted_at is null
    order by created_at asc nulls last, id asc
    limit 1;
  `);

  const course = courseResult.rows[0];
  const oc = ocResult.rows[0];
  if (!course) throw new Error('No active course found for live API smoke.');
  if (!oc) throw new Error('No active OC found for indirect API smoke.');

  return {
    courseId: course.id,
    courseCode: course.code,
    platoonId: platoonResult.rows[0]?.id ?? null,
    platoonLabel: platoonResult.rows[0]?.label ?? null,
    existingOcId: oc.id,
  };
}

async function findOcIdByOcNo(client: Client, ocNo: string) {
  const result = await client.query<{ id: string }>(
    `select id from oc_cadets where oc_no = $1 and deleted_at is null limit 1;`,
    [ocNo],
  );
  return result.rows[0]?.id ?? null;
}

async function softDeleteSmokeOcsByOcNo(client: Client, ocNos: string[]) {
  const normalizedOcNos = Array.from(new Set(ocNos.map((value) => value.trim()).filter(Boolean)));
  if (!normalizedOcNos.length) return [];

  const prefixPredicates = OC_SMOKE_OC_NO_PREFIXES.map((prefix, index) => `oc_no like $${index + 2}`).join(' or ');
  const result = await client.query<{ id: string; oc_no: string }>(
    `
      update oc_cadets
      set deleted_at = now(), updated_at = now()
      where deleted_at is null
        and oc_no = any($1::text[])
        and (${prefixPredicates})
      returning id, oc_no;
    `,
    [normalizedOcNos, ...OC_SMOKE_OC_NO_PREFIXES.map((prefix) => `${prefix}%`)],
  );

  return result.rows;
}

async function createAuth(baseUrl: string, session: Session) {
  const accessToken = await signAccessJWT({
    sub: session.userId,
    roles: session.roles,
    apt: session.apt,
    pwd_at: null,
  });

  const cookie = `access_token=${accessToken}`;
  const csrfResponse = await fetch(`${baseUrl}/api/v1/me`, {
    headers: { Cookie: cookie },
  });
  const csrfToken = csrfResponse.headers.get('X-CSRF-Token') ?? '';
  if (!csrfResponse.ok || !csrfToken) {
    throw new Error(`Unable to bootstrap CSRF token via /api/v1/me. Status=${csrfResponse.status}`);
  }

  return { cookie, csrfToken };
}

async function readResponsePayload(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    return { detail: text.slice(0, 240), json: null };
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  const message = body?.message ?? body?.error ?? body?.status ?? '';
  return {
    detail: typeof message === 'string' && message ? message.slice(0, 240) : JSON.stringify(body).slice(0, 240),
    json: body,
  };
}

async function main() {
  const args = parseArgs();
  await fs.mkdir(args.outDir, { recursive: true });

  const rows: SmokeRow[] = [];
  const runId = Date.now();
  let csrfToken = '';
  let cookie = '';
  let createdOcId: string | null = null;
  let bulkOcId: string | null = null;
  const createdSmokeOcNos: string[] = [];
  let smokeCleanupDetail = 'not applicable';

  const { session, targets } = await withDb(async (client) => ({
    session: await loadSession(client),
    targets: await loadRuntimeTargets(client),
  }));

  async function request(
    step: string,
    method: string,
    apiPath: string,
    body?: unknown,
    options: { allowStatuses?: number[] } = {},
  ) {
    const headers: Record<string, string> = {
      Cookie: cookie,
    };
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      headers['X-CSRF-Token'] = csrfToken;
    }

    let response: Response | null = null;
    try {
      response = await fetch(`${args.baseUrl}${apiPath}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const payload = await readResponsePayload(response);
      rows.push({
        step,
        method,
        path: apiPath,
        status: response.status,
        ok: response.ok || (options.allowStatuses ?? []).includes(response.status),
        detail: payload.detail,
      });
      return { response, json: payload.json };
    } catch (error) {
      rows.push({
        step,
        method,
        path: apiPath,
        status: null,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  try {
    const auth = await createAuth(args.baseUrl, session);
    cookie = auth.cookie;
    csrfToken = auth.csrfToken;
    rows.push({
      step: 'auth-bootstrap',
      method: 'GET',
      path: '/api/v1/me',
      status: 200,
      ok: true,
      detail: `Signed ${session.apt.position} session and received CSRF token.`,
    });

    await request('direct-oc-list-before', 'GET', '/api/v1/oc?limit=5&offset=0&sort=created_asc');
    await request('direct-admin-oc-data-health-before', 'GET', '/api/v1/admin/oc-data-health');

    if (args.mutate) {
      const singleOcNo = `SMOKE-OC-SINGLE-${runId}`;
      const createResponse = await request('direct-single-oc-create', 'POST', '/api/v1/oc', {
        name: `OC Smoke Single ${runId}`,
        ocNo: singleOcNo,
        courseId: targets.courseId,
        branch: 'O',
        platoonId: targets.platoonId,
        arrivalAtUniversity: '2026-01-10T00:00:00.000Z',
      });

      if (createResponse?.response.ok) {
        createdOcId = createResponse.json?.oc?.id ?? await withDb((client) => findOcIdByOcNo(client, singleOcNo));
        createdSmokeOcNos.push(singleOcNo);
      }

      const bulkOcNo = `SMOKE-OC-BULK-${runId}`;
      const bulkRow = {
        'Tes No': bulkOcNo,
        Name: `OC Smoke Bulk ${runId}`,
        Course: targets.courseCode,
        'Dt of Arrival': '2026-01-11',
        ...(targets.platoonLabel ? { Platoon: targets.platoonLabel } : {}),
        'E mail': `oc.smoke.${runId}@example.com`,
        'PAN Card No': `SM${String(runId).slice(-8)}`,
        'Aadhar No': `8${String(runId).padStart(11, '0').slice(-11)}`,
        'UPSC Roll No': `SMOKE-UPSC-${runId}`,
        PI: `PI-${String(runId).slice(-5)}`,
        "Father's Name": 'OC Smoke Father',
        'Blood GP': 'O+',
      };

      await request('direct-bulk-upload-dry-run', 'POST', '/api/v1/oc/bulk-upload?dryRun=1', { rows: [bulkRow] });
      const bulkResponse = await request('direct-bulk-upload-create', 'POST', '/api/v1/oc/bulk-upload', { rows: [bulkRow] });
      if (bulkResponse?.response.ok) {
        bulkOcId = await withDb((client) => findOcIdByOcNo(client, bulkOcNo));
        createdSmokeOcNos.push(bulkOcNo);
      }

      if (createdOcId) {
        await request('direct-oc-patch-lifecycle', 'PATCH', `/api/v1/oc/${createdOcId}`, {
          name: `OC Smoke Single Edited ${runId}`,
          branch: 'O',
          platoonId: targets.platoonId,
          withdrawnOn: null,
        });
        await request('direct-oc-detail-after-patch', 'GET', `/api/v1/oc/${createdOcId}`);
        await request('direct-dossier-snapshot-get', 'GET', `/api/v1/oc/${createdOcId}/dossier-snapshot`);
        await request('direct-dossier-snapshot-patch', 'PATCH', `/api/v1/oc/${createdOcId}/dossier-snapshot`, {
          tesNo: singleOcNo,
          name: `OC Smoke Single Edited ${runId}`,
          course: targets.courseCode,
          pi: `PI-${String(runId).slice(-5)}`,
          dtOfArr: '2026-01-10',
          withdrawnOn: '',
          dtOfPassingOut: '',
          icNo: '',
          orderOfMerit: '',
          regtArm: '',
          postedAtt: '',
        });
      }

      if (bulkOcId) {
        await request('direct-bulk-created-oc-detail', 'GET', `/api/v1/oc/${bulkOcId}`);
      }

      await request('direct-oc-list-after', 'GET', `/api/v1/oc?q=${encodeURIComponent('OC Smoke')}&limit=10&offset=0`);
      await request('direct-admin-oc-data-health-after', 'GET', '/api/v1/admin/oc-data-health');

      if (args.keepSmokeOcs) {
        smokeCleanupDetail = 'Skipped because --keep-smoke-ocs was provided.';
        rows.push({
          step: 'direct-smoke-oc-cleanup',
          method: 'DB',
          path: 'oc_cadets',
          status: null,
          ok: true,
          detail: smokeCleanupDetail,
        });
      } else {
        const cleanedRows = await withDb((client) => softDeleteSmokeOcsByOcNo(client, createdSmokeOcNos));
        smokeCleanupDetail = `Soft-deleted ${cleanedRows.length} created smoke OC(s).`;
        rows.push({
          step: 'direct-smoke-oc-cleanup',
          method: 'DB',
          path: 'oc_cadets',
          status: null,
          ok: cleanedRows.length === createdSmokeOcNos.length,
          detail: smokeCleanupDetail,
        });
      }
    } else {
      rows.push({
        step: 'mutation-flows-skipped',
        method: 'N/A',
        path: 'N/A',
        status: null,
        ok: true,
        detail: 'Run with --mutate to execute POST/PATCH staging smoke flows.',
      });
    }

    const indirectPaths = [
      '/academics',
      '/academics/1',
      '/spr?semester=1',
      '/fpr',
      '/discipline',
      '/medical',
      '/parent-comms',
      '/camps',
      '/sports-and-games',
      '/weapon-training',
      '/physical-training?semester=1',
      '/obstacle-training',
      '/speed-march',
      '/drill',
      '/olq?semester=1',
      '/credit-for-excellence',
      '/clubs',
      '/recording-leave-hike-detention',
      '/counselling',
      '/performance-graph',
    ];

    for (const suffix of indirectPaths) {
      await request(
        `indirect${suffix}`,
        'GET',
        `/api/v1/oc/${targets.existingOcId}${suffix}`,
        undefined,
        suffix.startsWith('/olq') ? { allowStatuses: [404] } : undefined,
      );
    }
    await request(
      'indirect-promotion-relegation-enrollment',
      'GET',
      `/api/v1/admin/relegation/enrollments/${targets.existingOcId}`,
    );
  } finally {
    await writeCsv(path.join(args.outDir, 'api-smoke.csv'), rows);
    await fs.writeFile(path.join(args.outDir, 'api-smoke-summary.md'), [
      '# OC Live API Smoke Summary',
      '',
      `Base URL: ${args.baseUrl}`,
      `Mode: ${args.mutate ? 'mutating staging smoke' : 'read-only plus dry-run smoke'}`,
      `Existing OC checked: ${targets.existingOcId}`,
      `Single created OC: ${createdOcId ?? 'not created'}`,
      `Bulk created OC: ${bulkOcId ?? 'not created'}`,
      `Smoke OC cleanup: ${smokeCleanupDetail}`,
      `Total checks: ${rows.length}`,
      `Failed checks: ${rows.filter((row) => !row.ok).length}`,
      '',
      'Evidence: `api-smoke.csv`',
      '',
    ].join('\n'));
  }

  const failures = rows.filter((row) => !row.ok);
  console.log(`OC live API smoke written to ${args.outDir}`);
  console.log(`Checks: ${rows.length}, failures: ${failures.length}`);
  if (failures.length) {
    for (const failure of failures.slice(0, 10)) {
      console.error(`${failure.step} ${failure.method} ${failure.path} -> ${failure.status}: ${failure.detail}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
