import "dotenv/config";
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { SignJWT, importPKCS8 } from "jose";
import { Client } from "pg";

import { acquireLiveSuiteLock } from "./live-suite-lock";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

const JWT_ISSUER = "e-dossier";
const JWT_AUDIENCE = "e-dossier-api";

const SUPER_ADMIN_SESSION = {
  userId: "a5b41269-a5a0-4ff8-8de0-a76d45299be8",
  roles: ["SUPER_ADMIN"],
  apt: {
    id: "8387f26c-9969-4268-bd75-758b7572d20e",
    position: "SUPER_ADMIN",
    scope: { type: "GLOBAL", id: null as string | null },
    valid_from: "2026-04-03T19:45:26.044Z",
    valid_to: null as string | null,
  },
};

type Session = typeof SUPER_ADMIN_SESSION;

type ArchiveFixture = {
  ocId: string;
  ocNo: string;
  courseId: string;
  medicalId: string;
  medicalCategoryId: string;
  disciplineId: string;
  parentCommId: string;
  ssbReportId: string;
  inspectionId: string;
  interviewId: string;
  interviewTemplateId: string;
  interviewFieldId: string;
};

let releaseLiveSuiteLock: null | (() => Promise<void>) = null;

test.beforeAll(async () => {
  releaseLiveSuiteLock = await acquireLiveSuiteLock();
});

test.afterAll(async () => {
  await releaseLiveSuiteLock?.();
  releaseLiveSuiteLock = null;
});

function normalizePem(value?: string) {
  return (value ?? "").replace(/\\n/g, "\n").replace(/^"+|"+$/g, "").trim();
}

async function signAccessToken(session: Session) {
  const privateKeyPem = normalizePem(process.env.ACCESS_TOKEN_PRIVATE_KEY);
  if (!privateKeyPem) {
    throw new Error("ACCESS_TOKEN_PRIVATE_KEY is required for the live archive/delete-policy test.");
  }

  const privateKey = await importPKCS8(privateKeyPem, "EdDSA");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    roles: session.roles,
    apt: session.apt,
    pwd_at: null,
  })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(session.userId)
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + 900)
    .sign(privateKey);
}

async function createAuthedContext(browser: Browser, session: Session) {
  const token = await signAccessToken(session);
  const context = await browser.newContext({ baseURL: BASE_URL });
  const base = new URL(BASE_URL);

  await context.addCookies([
    {
      name: "access_token",
      value: token,
      domain: base.hostname,
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
    },
  ]);

  return context;
}

async function bootstrapCsrf(context: BrowserContext) {
  const response = await context.request.get("/api/v1/me");
  expect(response.ok()).toBeTruthy();
  const cookies = await context.cookies(BASE_URL);
  const csrfCookie = cookies.find((cookie) => cookie.name === "csrf-token");
  if (!csrfCookie?.value) {
    throw new Error("Expected a csrf-token cookie after a protected API GET.");
  }
  return csrfCookie.value;
}

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function setupArchiveFixture(client: Client, runId: string): Promise<ArchiveFixture> {
  const prereq = await client.query(
    `
      select
        c.id as course_id,
        p.id as platoon_id,
        u.id as inspector_user_id
      from courses c
      cross join platoons p
      cross join users u
      where c.deleted_at is null
        and p.deleted_at is null
      order by c.created_at asc nulls last, p.created_at asc nulls last, u.created_at asc nulls last
      limit 1
    `
  );

  const courseId = prereq.rows[0]?.course_id as string | undefined;
  const platoonId = prereq.rows[0]?.platoon_id as string | undefined;
  const inspectorUserId = prereq.rows[0]?.inspector_user_id as string | undefined;

  if (!courseId || !platoonId || !inspectorUserId) {
    throw new Error("Missing course/platoon/user prerequisites for the live archive/delete-policy test.");
  }

  const ocNo = `PH6-${runId}`;
  const ocRes = await client.query(
    `
      insert into oc_cadets (
        oc_no,
        uid,
        name,
        course_id,
        branch,
        platoon_id,
        arrival_at_university,
        status
      )
      values ($1, $2, $3, $4, 'O', $5, now(), 'ACTIVE')
      returning id
    `,
    [ocNo, `UID-PH6-${runId}`, `Phase 6 OC ${runId}`, courseId, platoonId]
  );
  const ocId = resValue<string>(ocRes, "id");

  const medicalId = resValue<string>(
    await client.query(
      `
        insert into oc_medicals (oc_id, semester, date, allergies)
        values ($1, 5, now(), 'Nil')
        returning id
      `,
      [ocId]
    ),
    "id"
  );

  const medicalCategoryId = resValue<string>(
    await client.query(
      `
        insert into oc_medical_category (oc_id, semester, date, mos_and_diagnostics)
        values ($1, 5, now(), 'Fit')
        returning id
      `,
      [ocId]
    ),
    "id"
  );

  const disciplineId = resValue<string>(
    await client.query(
      `
        insert into oc_discipline (oc_id, semester, date_of_offence, offence)
        values ($1, 5, now(), 'Discipline note')
        returning id
      `,
      [ocId]
    ),
    "id"
  );

  const parentCommId = resValue<string>(
    await client.query(
      `
        insert into oc_parent_comms (oc_id, semester, mode, date, brief)
        values ($1, 5, 'EMAIL', now(), 'Parent communication note')
        returning id
      `,
      [ocId]
    ),
    "id"
  );

  const ssbReportId = resValue<string>(
    await client.query(
      `
        insert into oc_ssb_reports (oc_id, overall_predictive_rating, scope_of_improvement)
        values ($1, 4, 'Improve confidence')
        returning id
      `,
      [ocId]
    ),
    "id"
  );

  await client.query(
    `
      insert into oc_ssb_points (report_id, kind, remark, author_name)
      values ($1, 'POSITIVE', 'Alert', 'Assessor')
    `,
    [ssbReportId]
  );

  const inspectionId = resValue<string>(
    await client.query(
      `
        insert into dossier_inspections (oc_id, inspector_user_id, date, remarks)
        values ($1, $2, now(), 'Inspection note')
        returning id
      `,
      [ocId, inspectorUserId]
    ),
    "id"
  );

  const interviewTemplateId = resValue<string>(
    await client.query(
      `
        insert into interview_templates (code, title, description)
        values ($1, $2, 'Phase 6 archive fixture')
        returning id
      `,
      [`PH6-TPL-${runId}`, `Phase 6 Template ${runId}`]
    ),
    "id"
  );

  await client.query(
    `
      insert into interview_template_semesters (template_id, semester)
      values ($1, 5)
    `,
    [interviewTemplateId]
  );

  const interviewFieldId = resValue<string>(
    await client.query(
      `
        insert into interview_template_fields (template_id, key, label, field_type)
        values ($1, $2, 'Observation', 'TEXT')
        returning id
      `,
      [interviewTemplateId, `ph6-field-${runId}`]
    ),
    "id"
  );

  const interviewId = resValue<string>(
    await client.query(
      `
        insert into oc_interviews (oc_id, template_id, semester, course)
        values ($1, $2, 5, 'Phase 6 Course')
        returning id
      `,
      [ocId, interviewTemplateId]
    ),
    "id"
  );

  await client.query(
    `
      insert into oc_interview_field_values (interview_id, field_id, value_text)
      values ($1, $2, 'Interview value')
    `,
    [interviewId, interviewFieldId]
  );

  return {
    ocId,
    ocNo,
    courseId,
    medicalId,
    medicalCategoryId,
    disciplineId,
    parentCommId,
    ssbReportId,
    inspectionId,
    interviewId,
    interviewTemplateId,
    interviewFieldId,
  };
}

function resValue<T>(result: { rows: Array<Record<string, unknown>> }, key: string): T {
  const value = result.rows[0]?.[key];
  if (!value) {
    throw new Error(`Expected SQL result to include ${key}.`);
  }
  return value as T;
}

async function readArchiveState(client: Client, fixture: ArchiveFixture) {
  const [ocRes, medicalRes, medicalCategoryRes, disciplineRes, parentCommRes, ssbReportRes, ssbPointRes, inspectionRes, interviewRes, interviewValueRes] =
    await Promise.all([
      client.query(
        `select status, deleted_at is not null as archived from oc_cadets where id = $1`,
        [fixture.ocId]
      ),
      client.query(`select count(*)::int as count from oc_medicals where id = $1`, [fixture.medicalId]),
      client.query(`select count(*)::int as count from oc_medical_category where id = $1`, [fixture.medicalCategoryId]),
      client.query(`select count(*)::int as count from oc_discipline where id = $1`, [fixture.disciplineId]),
      client.query(`select count(*)::int as count from oc_parent_comms where id = $1`, [fixture.parentCommId]),
      client.query(`select count(*)::int as count from oc_ssb_reports where id = $1`, [fixture.ssbReportId]),
      client.query(`select count(*)::int as count from oc_ssb_points where report_id = $1`, [fixture.ssbReportId]),
      client.query(`select count(*)::int as count from dossier_inspections where id = $1`, [fixture.inspectionId]),
      client.query(`select count(*)::int as count from oc_interviews where id = $1`, [fixture.interviewId]),
      client.query(
        `select count(*)::int as count from oc_interview_field_values where interview_id = $1`,
        [fixture.interviewId]
      ),
    ]);

  return {
    oc: ocRes.rows[0],
    medicalCount: Number(medicalRes.rows[0]?.count ?? 0),
    medicalCategoryCount: Number(medicalCategoryRes.rows[0]?.count ?? 0),
    disciplineCount: Number(disciplineRes.rows[0]?.count ?? 0),
    parentCommCount: Number(parentCommRes.rows[0]?.count ?? 0),
    ssbReportCount: Number(ssbReportRes.rows[0]?.count ?? 0),
    ssbPointCount: Number(ssbPointRes.rows[0]?.count ?? 0),
    inspectionCount: Number(inspectionRes.rows[0]?.count ?? 0),
    interviewCount: Number(interviewRes.rows[0]?.count ?? 0),
    interviewValueCount: Number(interviewValueRes.rows[0]?.count ?? 0),
  };
}

async function cleanupArchiveFixture(client: Client, fixture: ArchiveFixture | null) {
  if (!fixture) return;

  await client.query(`delete from oc_interview_field_values where interview_id = $1`, [fixture.interviewId]);
  await client.query(`delete from oc_interviews where id = $1`, [fixture.interviewId]);
  await client.query(`delete from interview_template_fields where id = $1`, [fixture.interviewFieldId]);
  await client.query(`delete from interview_template_semesters where template_id = $1`, [fixture.interviewTemplateId]);
  await client.query(`delete from interview_templates where id = $1`, [fixture.interviewTemplateId]);
  await client.query(`delete from dossier_inspections where id = $1`, [fixture.inspectionId]);
  await client.query(`delete from oc_ssb_points where report_id = $1`, [fixture.ssbReportId]);
  await client.query(`delete from oc_ssb_reports where id = $1`, [fixture.ssbReportId]);
  await client.query(`delete from oc_parent_comms where id = $1`, [fixture.parentCommId]);
  await client.query(`delete from oc_discipline where id = $1`, [fixture.disciplineId]);
  await client.query(`delete from oc_medical_category where id = $1`, [fixture.medicalCategoryId]);
  await client.query(`delete from oc_medicals where id = $1`, [fixture.medicalId]);
  await client.query(`delete from oc_cadets where id = $1`, [fixture.ocId]);
}

test("archiving an OC hides it operationally but preserves first-level historical data", async ({ browser }) => {
  test.setTimeout(90_000);

  const context = await createAuthedContext(browser, SUPER_ADMIN_SESSION);
  const csrfToken = await bootstrapCsrf(context);
  const runId = String(Date.now());
  let fixture: ArchiveFixture | null = null;

  try {
    fixture = await withDb((client) => setupArchiveFixture(client, runId));

    const deleteResponse = await context.request.delete(`/api/v1/oc/${fixture.ocId}`, {
      headers: {
        "X-CSRF-Token": csrfToken,
      },
    });
    expect(deleteResponse.ok()).toBeTruthy();
    const deleteBody = await deleteResponse.json();
    expect(deleteBody.archived).toBe(true);

    const listResponse = await context.request.get(`/api/v1/oc?courseId=${fixture.courseId}`);
    expect(listResponse.ok()).toBeTruthy();
    const listBody = await listResponse.json();
    expect((listBody.items ?? []).some((item: { id: string }) => item.id === fixture!.ocId)).toBeFalsy();

    const detailResponse = await context.request.get(`/api/v1/oc/${fixture.ocId}`);
    expect(detailResponse.status()).toBe(404);

    const medicalResponse = await context.request.get(`/api/v1/oc/${fixture.ocId}/medical`);
    expect(medicalResponse.status()).toBe(404);

    const page = await context.newPage();
    const directUrlResponse = await page.goto(`/dashboard/${fixture.ocId}/milmgmt/dossier-snapshot?tab=basic-details`);
    expect(directUrlResponse).not.toBeNull();
    expect([200, 404]).toContain(directUrlResponse?.status() ?? 0);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "This page could not be found." })).toBeVisible();

    const archiveState = await withDb((client) => readArchiveState(client, fixture!));
    expect(archiveState.oc).toMatchObject({
      status: "INACTIVE",
      archived: true,
    });
    expect(archiveState.medicalCount).toBe(1);
    expect(archiveState.medicalCategoryCount).toBe(1);
    expect(archiveState.disciplineCount).toBe(1);
    expect(archiveState.parentCommCount).toBe(1);
    expect(archiveState.ssbReportCount).toBe(1);
    expect(archiveState.ssbPointCount).toBe(1);
    expect(archiveState.inspectionCount).toBe(1);
    expect(archiveState.interviewCount).toBe(1);
    expect(archiveState.interviewValueCount).toBe(1);
  } finally {
    await withDb((client) => cleanupArchiveFixture(client, fixture));
    await context.close();
  }
});
