import 'dotenv/config';
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { SignJWT, importPKCS8 } from 'jose';
import { Client } from 'pg';

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:3000';
const JWT_ISSUER = 'e-dossier';
const JWT_AUDIENCE = 'e-dossier-api';

const MAKER_USER_ID = '8bf30fde-3cec-4b28-b2a8-1377da9d428a';
const VERIFIER_USER_ID = '312d3216-7ff0-4663-b270-f181d8f29039';

const ACADEMICS_TARGET = {
  courseId: '802f9be3-55b6-4d11-bd8a-03b7860b23f8',
  semester: 2,
  subjectId: '3e1c31e3-41ec-4ac1-b65b-dccbc097689a',
  selectionLabel: 'Course-100 - Course Course-100 / Semester 2 / CSIT-001 - COMPUTER SCIENCE & IT',
};

const PT_TARGET = {
  courseId: '802f9be3-55b6-4d11-bd8a-03b7860b23f8',
  semester: 2,
  selectionLabel: 'Course-100 - Course Course-100 / Semester 2 / PT Bulk',
};

const ADMIN_SESSION = {
  userId: VERIFIER_USER_ID,
  roles: ['ADMIN'],
  apt: {
    id: '3b4adb60-72b7-4fda-ae9d-68b5841357f8',
    position: 'ADMIN',
    scope: { type: 'GLOBAL', id: null as string | null },
    valid_from: '2025-10-25T00:00:00.000Z',
    valid_to: null as string | null,
  },
};

const MAKER_SESSION = {
  userId: MAKER_USER_ID,
  roles: [] as string[],
  apt: {
    id: 'c3e284e7-84f0-473f-9062-f4d67a393c14',
    position: 'arjunplcdr',
    scope: { type: 'PLATOON', id: '0d95a05c-6064-4fb5-9566-df8e60dfee81' },
    valid_from: '2026-03-04T00:00:00.000Z',
    valid_to: null as string | null,
  },
};

function normalizePem(value?: string) {
  return (value ?? '').replace(/\\n/g, '\n').replace(/^"+|"+$/g, '').trim();
}

async function signAccessToken(session: {
  userId: string;
  roles: string[];
  apt: {
    id: string;
    position: string;
    scope: { type: string; id: string | null };
    valid_from: string;
    valid_to: string | null;
  };
}) {
  const privateKeyPem = normalizePem(process.env.ACCESS_TOKEN_PRIVATE_KEY);
  if (!privateKeyPem) {
    throw new Error('ACCESS_TOKEN_PRIVATE_KEY is required for the live browser workflow test.');
  }

  const privateKey = await importPKCS8(privateKeyPem, 'EdDSA');
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    roles: session.roles,
    apt: session.apt,
    pwd_at: null,
  })
    .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(session.userId)
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + 900)
    .sign(privateKey);
}

async function createAuthedContext(browser: Browser, session: typeof ADMIN_SESSION | typeof MAKER_SESSION) {
  const token = await signAccessToken(session);
  const context = await browser.newContext({ baseURL: BASE_URL });
  const base = new URL(BASE_URL);
  await context.addCookies([
    {
      name: 'access_token',
      value: token,
      domain: base.hostname,
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
    },
  ]);
  return context;
}

async function clearWorkflowStateForTarget() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('begin');

    await client.query(
      `
        insert into marks_workflow_settings (
          module,
          data_entry_user_ids,
          verification_user_ids,
          post_verification_override_mode,
          created_at,
          updated_at
        )
        values
          ('ACADEMICS_BULK', $1::jsonb, $2::jsonb, 'ADMIN_AND_SUPER_ADMIN', now(), now()),
          ('PT_BULK', $1::jsonb, $2::jsonb, 'ADMIN_AND_SUPER_ADMIN', now(), now())
        on conflict (module) do update
        set
          data_entry_user_ids = excluded.data_entry_user_ids,
          verification_user_ids = excluded.verification_user_ids,
          post_verification_override_mode = excluded.post_verification_override_mode,
          updated_at = now()
      `,
      [JSON.stringify([MAKER_USER_ID]), JSON.stringify([VERIFIER_USER_ID])],
    );

    await client.query(
      `
        with target_tickets as (
          select id
          from marks_workflow_tickets
          where
            (module = 'ACADEMICS_BULK'
             and course_id = $1
             and semester = $2
             and subject_id = $3)
            or
            (module = 'PT_BULK'
             and course_id = $4
             and semester = $5
             and subject_id is null)
        )
        delete from marks_workflow_notifications
        where ticket_id in (select id from target_tickets)
      `,
      [
        ACADEMICS_TARGET.courseId,
        ACADEMICS_TARGET.semester,
        ACADEMICS_TARGET.subjectId,
        PT_TARGET.courseId,
        PT_TARGET.semester,
      ],
    );

    await client.query(
      `
        with target_tickets as (
          select id
          from marks_workflow_tickets
          where
            (module = 'ACADEMICS_BULK'
             and course_id = $1
             and semester = $2
             and subject_id = $3)
            or
            (module = 'PT_BULK'
             and course_id = $4
             and semester = $5
             and subject_id is null)
        )
        delete from marks_workflow_events
        where ticket_id in (select id from target_tickets)
      `,
      [
        ACADEMICS_TARGET.courseId,
        ACADEMICS_TARGET.semester,
        ACADEMICS_TARGET.subjectId,
        PT_TARGET.courseId,
        PT_TARGET.semester,
      ],
    );

    await client.query(
      `
        delete from marks_workflow_tickets
        where
          (module = 'ACADEMICS_BULK'
           and course_id = $1
           and semester = $2
           and subject_id = $3)
          or
          (module = 'PT_BULK'
           and course_id = $4
           and semester = $5
           and subject_id is null)
      `,
      [
        ACADEMICS_TARGET.courseId,
        ACADEMICS_TARGET.semester,
        ACADEMICS_TARGET.subjectId,
        PT_TARGET.courseId,
        PT_TARGET.semester,
      ],
    );

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

async function waitForWorkflowBadge(page: Page, text: string) {
  await expect(page.getByText(text, { exact: true }).first()).toBeVisible({ timeout: 15000 });
}

async function waitForNotification(page: Page, selectionLabel: string, statusText: string) {
  await page.goto('/dashboard');
  const card = page.locator('div.rounded-md.border').filter({ hasText: selectionLabel }).first();
  await expect(card).toBeVisible({ timeout: 20000 });
  await expect(card.getByText(statusText, { exact: false })).toBeVisible();
  return card;
}

async function openNotificationTicket(page: Page, selectionLabel: string, statusText: string) {
  const card = await waitForNotification(page, selectionLabel, statusText);
  await card.getByRole('link', { name: 'Open Ticket' }).click();
}

async function getAcademicsRow(page: Page) {
  const row = page.locator('tr').filter({ hasText: 'Pratik' }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  return row;
}

async function getPtRow(page: Page) {
  const row = page.locator('tr').filter({ hasText: 'Pratik' }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  return row;
}

function workflowMessageBox(page: Page) {
  return page.getByPlaceholder('Add a message for verifier edits, change requests, or overrides.');
}

async function fillChangedNumeric(locator: ReturnType<Page['locator']>, preferredValue: string) {
  const current = await locator.inputValue();
  const next =
    current === preferredValue ? String((Number(preferredValue) || 0) + 1) : preferredValue;
  await locator.fill(next);
  return next;
}

async function fillChangedText(locator: ReturnType<Page['locator']>, preferredValue: string) {
  const current = await locator.inputValue();
  const next = current === preferredValue ? `${preferredValue}-updated` : preferredValue;
  await locator.fill(next);
  return next;
}

test.describe.serial('Marks workflow live browser flow', () => {
  test.beforeAll(async () => {
    await clearWorkflowStateForTarget();
  });

  test('settings page loads after workflow setup', async ({ browser }) => {
    const adminContext = await createAuthedContext(browser, ADMIN_SESSION);
    const page = await adminContext.newPage();

    await page.goto('/dashboard/genmgmt/settings/marks-review-workflow');
    await expect(page.getByRole('heading', { name: 'Marks Review Workflow' }).first()).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText('Academics Bulk Workflow')).toBeVisible();
    await expect(page.getByText('PT Bulk Workflow')).toBeVisible();
    await expect(page.getByText('Active').first()).toBeVisible();

    await adminContext.close();
  });

  test('academics maker-verifier flow works live', async ({ browser }) => {
    test.setTimeout(120000);
    const runId = Date.now().toString().slice(-5);
    const makerPhase1 = String((Number(runId.slice(-1)) % 5) + 1);
    const makerFinal = String((Number(runId.slice(-2)) % 20) + 10);
    const makerPractical = String((Number(runId.slice(-2)) % 10) + 5);
    const verifierFinal = String(Number(makerFinal) + 1);
    const makerPhase2 = String(Number(makerPhase1) + 1);
    const overridePractical = String(Number(makerPractical) + 1);
    const verifierDraftMessage = `Verifier edit ${runId}`;
    const requestChangesMessage = `Need revision ${runId}`;
    const verifyMessage = `Verified ${runId}`;
    const overrideMessage = `Override publish ${runId}`;

    const makerContext = await createAuthedContext(browser, MAKER_SESSION);
    const adminContext = await createAuthedContext(browser, ADMIN_SESSION);
    const makerPage = await makerContext.newPage();
    const adminPage = await adminContext.newPage();

    await makerPage.goto(
      `/dashboard/manage-marks?courseId=${ACADEMICS_TARGET.courseId}&semester=${ACADEMICS_TARGET.semester}&subjectId=${ACADEMICS_TARGET.subjectId}`,
    );
    await waitForWorkflowBadge(makerPage, 'DRAFT');

    const makerRow = await getAcademicsRow(makerPage);
    const makerInputs = makerRow.locator('input');
    await fillChangedNumeric(makerInputs.nth(0), makerPhase1);
    await fillChangedNumeric(makerInputs.nth(3), makerFinal);
    await fillChangedNumeric(makerInputs.nth(4), makerPractical);

    await makerPage.getByRole('button', { name: 'Save Draft' }).click();
    await expect(makerPage.getByRole('button', { name: 'Save Draft' })).toBeDisabled({ timeout: 15000 });

    await makerPage.getByRole('button', { name: 'Submit For Verification' }).click();
    await waitForWorkflowBadge(makerPage, 'PENDING VERIFICATION');
    await expect(makerInputs.nth(0)).toBeDisabled();

    await openNotificationTicket(adminPage, ACADEMICS_TARGET.selectionLabel, 'PENDING VERIFICATION');
    await waitForWorkflowBadge(adminPage, 'PENDING VERIFICATION');

    const verifierRow = await getAcademicsRow(adminPage);
    const verifierInputs = verifierRow.locator('input');
    await expect(verifierInputs.nth(3)).toBeEnabled();
    await fillChangedNumeric(verifierInputs.nth(3), verifierFinal);
    await workflowMessageBox(adminPage).fill(verifierDraftMessage);
    await adminPage.getByRole('button', { name: 'Save Draft' }).click();
    await expect(adminPage.getByText(verifierDraftMessage)).toBeVisible({ timeout: 15000 });

    await workflowMessageBox(adminPage).fill(requestChangesMessage);
    await adminPage.getByRole('button', { name: 'Request Changes' }).click();
    await waitForWorkflowBadge(adminPage, 'CHANGES REQUESTED');
    await expect(verifierInputs.nth(3)).toBeDisabled();

    await openNotificationTicket(makerPage, ACADEMICS_TARGET.selectionLabel, 'CHANGES REQUESTED');
    await waitForWorkflowBadge(makerPage, 'CHANGES REQUESTED');

    const revisedMakerRow = await getAcademicsRow(makerPage);
    const revisedMakerInputs = revisedMakerRow.locator('input');
    await expect(revisedMakerInputs.nth(1)).toBeEnabled();
    await fillChangedNumeric(revisedMakerInputs.nth(1), makerPhase2);
    await expect(makerPage.getByRole('button', { name: 'Save Draft' })).toBeEnabled({ timeout: 15000 });
    await makerPage.getByRole('button', { name: 'Save Draft' }).click();
    await makerPage.getByRole('button', { name: 'Submit For Verification' }).click();
    await waitForWorkflowBadge(makerPage, 'PENDING VERIFICATION');

    await adminPage.goto(
      `/dashboard/manage-marks?courseId=${ACADEMICS_TARGET.courseId}&semester=${ACADEMICS_TARGET.semester}&subjectId=${ACADEMICS_TARGET.subjectId}`,
    );
    await waitForWorkflowBadge(adminPage, 'PENDING VERIFICATION');
    await workflowMessageBox(adminPage).fill(verifyMessage);
    await adminPage.getByRole('button', { name: 'Verify And Publish' }).click();
    await waitForWorkflowBadge(adminPage, 'VERIFIED');

    const verifiedRow = await getAcademicsRow(adminPage);
    const verifiedInputs = verifiedRow.locator('input');
    await expect(verifiedInputs.nth(4)).toBeEnabled();
    await fillChangedNumeric(verifiedInputs.nth(4), overridePractical);
    await workflowMessageBox(adminPage).fill(overrideMessage);
    await adminPage.getByRole('button', { name: 'Override Publish' }).click();
    await waitForWorkflowBadge(adminPage, 'VERIFIED');
    await expect(adminPage.getByText(overrideMessage)).toBeVisible({ timeout: 15000 });

    const verifiedNotification = await waitForNotification(makerPage, ACADEMICS_TARGET.selectionLabel, 'VERIFIED');
    await expect(verifiedNotification.getByText('Verification completed.')).toBeVisible();

    await makerContext.close();
    await adminContext.close();
  });

  test('pt maker-verifier flow works live', async ({ browser }) => {
    test.setTimeout(120000);
    const runId = Date.now().toString().slice(-5);
    const makerPtScore = String((Number(runId.slice(-1)) % 5) + 2);
    const verifierPtScore = String(Number(makerPtScore) + 1);
    const overridePtScore = String(Number(verifierPtScore) + 1);
    const makerMotivation = `mot-${runId}`;
    const verifierDraftMessage = `PT verifier edit ${runId}`;
    const requestChangesMessage = `PT changes ${runId}`;
    const verifyMessage = `PT verified ${runId}`;
    const overrideMessage = `PT override ${runId}`;

    const makerContext = await createAuthedContext(browser, MAKER_SESSION);
    const adminContext = await createAuthedContext(browser, ADMIN_SESSION);
    const makerPage = await makerContext.newPage();
    const adminPage = await adminContext.newPage();

    await makerPage.goto(`/dashboard/manage-pt-marks?courseId=${PT_TARGET.courseId}&semester=${PT_TARGET.semester}`);
    await waitForWorkflowBadge(makerPage, 'DRAFT');

    const makerScoreRow = await getPtRow(makerPage);
    const makerScoreInput = makerScoreRow.locator('input').first();
    await fillChangedNumeric(makerScoreInput, makerPtScore);
    await makerPage.getByRole('tab', { name: 'Motivation' }).click();
    const makerMotivationRow = await getPtRow(makerPage);
    await fillChangedText(makerMotivationRow.locator('input').first(), makerMotivation);

    await makerPage.getByRole('button', { name: 'Save Draft' }).click();
    await expect(makerPage.getByRole('button', { name: 'Save Draft' })).toBeDisabled({ timeout: 15000 });
    await makerPage.getByRole('button', { name: 'Submit For Verification' }).click();
    await waitForWorkflowBadge(makerPage, 'PENDING VERIFICATION');

    await adminPage.goto(`/dashboard/manage-pt-marks?courseId=${PT_TARGET.courseId}&semester=${PT_TARGET.semester}`);
    await waitForWorkflowBadge(adminPage, 'PENDING VERIFICATION');

    const verifierScoreRow = await getPtRow(adminPage);
    const verifierScoreInput = verifierScoreRow.locator('input').first();
    await expect(verifierScoreInput).toBeEnabled();
    await fillChangedNumeric(verifierScoreInput, verifierPtScore);
    await workflowMessageBox(adminPage).fill(verifierDraftMessage);
    await adminPage.getByRole('button', { name: 'Save Draft' }).click();
    await expect(adminPage.getByText(verifierDraftMessage)).toBeVisible({ timeout: 15000 });

    await workflowMessageBox(adminPage).fill(requestChangesMessage);
    await adminPage.getByRole('button', { name: 'Request Changes' }).click();
    await waitForWorkflowBadge(adminPage, 'CHANGES REQUESTED');

    await makerPage.goto(`/dashboard/manage-pt-marks?courseId=${PT_TARGET.courseId}&semester=${PT_TARGET.semester}`);
    await waitForWorkflowBadge(makerPage, 'CHANGES REQUESTED');
    const revisedMakerScoreRow = await getPtRow(makerPage);
    await expect(revisedMakerScoreRow.locator('input').first()).toBeEnabled();
    await fillChangedNumeric(revisedMakerScoreRow.locator('input').first(), makerPtScore);
    await expect(makerPage.getByRole('button', { name: 'Save Draft' })).toBeEnabled({ timeout: 15000 });
    await makerPage.getByRole('button', { name: 'Save Draft' }).click();
    await makerPage.getByRole('button', { name: 'Submit For Verification' }).click();
    await waitForWorkflowBadge(makerPage, 'PENDING VERIFICATION');

    await adminPage.goto(`/dashboard/manage-pt-marks?courseId=${PT_TARGET.courseId}&semester=${PT_TARGET.semester}`);
    await waitForWorkflowBadge(adminPage, 'PENDING VERIFICATION');
    await workflowMessageBox(adminPage).fill(verifyMessage);
    await adminPage.getByRole('button', { name: 'Verify And Publish' }).click();
    await waitForWorkflowBadge(adminPage, 'VERIFIED');

    const verifiedScoreRow = await getPtRow(adminPage);
    const verifiedScoreInput = verifiedScoreRow.locator('input').first();
    await expect(verifiedScoreInput).toBeEnabled();
    await fillChangedNumeric(verifiedScoreInput, overridePtScore);
    await workflowMessageBox(adminPage).fill(overrideMessage);
    await adminPage.getByRole('button', { name: 'Override Publish' }).click();
    await waitForWorkflowBadge(adminPage, 'VERIFIED');
    await expect(adminPage.getByText(overrideMessage)).toBeVisible({ timeout: 15000 });

    await makerContext.close();
    await adminContext.close();
  });
});
