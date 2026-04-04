import "dotenv/config";
import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { SignJWT, importPKCS8 } from "jose";
import { Client } from "pg";
import { acquireLiveSuiteLock } from "./live-suite-lock";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

const JWT_ISSUER = "e-dossier";
const JWT_AUDIENCE = "e-dossier-api";
const ADMIN_USER_ID = "312d3216-7ff0-4663-b270-f181d8f29039";

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

const ADMIN_SESSION = {
  userId: ADMIN_USER_ID,
  roles: ["ADMIN"],
  apt: {
    id: "3b4adb60-72b7-4fda-ae9d-68b5841357f8",
    position: "ADMIN",
    scope: { type: "GLOBAL", id: null as string | null },
    valid_from: "2025-10-25T00:00:00.000Z",
    valid_to: null as string | null,
  },
};

type Session = typeof SUPER_ADMIN_SESSION | typeof ADMIN_SESSION;

type ModuleSettingsSnapshot = {
  id: string;
  singletonKey: string;
  adminCanAccessDossier: boolean;
  adminCanAccessBulkUpload: boolean;
  adminCanAccessReports: boolean;
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
} | null;

type WorkflowSettingsSnapshot = {
  module: "ACADEMICS_BULK" | "PT_BULK";
  dataEntryUserIds: string[];
  verificationUserIds: string[];
};

type RuntimeTargets = {
  courseId: string;
  ocId: string;
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
    throw new Error("ACCESS_TOKEN_PRIVATE_KEY is required for the live module-access test.");
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

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function snapshotModuleSettings(client: Client): Promise<ModuleSettingsSnapshot> {
  const res = await client.query(
    `
      select
        id,
        singleton_key as "singletonKey",
        admin_can_access_dossier as "adminCanAccessDossier",
        admin_can_access_bulk_upload as "adminCanAccessBulkUpload",
        admin_can_access_reports as "adminCanAccessReports",
        updated_by as "updatedBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from module_access_settings
      where singleton_key = 'default'
      limit 1
    `
  );

  return res.rows[0] ?? null;
}

async function writeModuleSettings(
  client: Client,
  settings: {
    adminCanAccessDossier: boolean;
    adminCanAccessBulkUpload: boolean;
    adminCanAccessReports: boolean;
  }
) {
  await client.query(
    `
      insert into module_access_settings (
        singleton_key,
        admin_can_access_dossier,
        admin_can_access_bulk_upload,
        admin_can_access_reports
      )
      values ('default', $1, $2, $3)
      on conflict (singleton_key) do update
      set
        admin_can_access_dossier = excluded.admin_can_access_dossier,
        admin_can_access_bulk_upload = excluded.admin_can_access_bulk_upload,
        admin_can_access_reports = excluded.admin_can_access_reports,
        updated_at = now()
    `,
    [
      settings.adminCanAccessDossier,
      settings.adminCanAccessBulkUpload,
      settings.adminCanAccessReports,
    ]
  );
}

async function restoreModuleSettings(client: Client, snapshot: ModuleSettingsSnapshot) {
  if (!snapshot) {
    await client.query(`delete from module_access_settings where singleton_key = 'default'`);
    return;
  }

  await client.query(
    `
      insert into module_access_settings (
        id,
        singleton_key,
        admin_can_access_dossier,
        admin_can_access_bulk_upload,
        admin_can_access_reports,
        updated_by,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz)
      on conflict (singleton_key) do update
      set
        id = excluded.id,
        admin_can_access_dossier = excluded.admin_can_access_dossier,
        admin_can_access_bulk_upload = excluded.admin_can_access_bulk_upload,
        admin_can_access_reports = excluded.admin_can_access_reports,
        updated_by = excluded.updated_by,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `,
    [
      snapshot.id,
      snapshot.singletonKey,
      snapshot.adminCanAccessDossier,
      snapshot.adminCanAccessBulkUpload,
      snapshot.adminCanAccessReports,
      snapshot.updatedBy,
      snapshot.createdAt,
      snapshot.updatedAt,
    ]
  );
}

async function snapshotWorkflowSettings(client: Client): Promise<WorkflowSettingsSnapshot[]> {
  const res = await client.query(
    `
      select
        module,
        coalesce(data_entry_user_ids, '[]'::jsonb) as "dataEntryUserIds",
        coalesce(verification_user_ids, '[]'::jsonb) as "verificationUserIds"
      from marks_workflow_settings
      where module in ('ACADEMICS_BULK', 'PT_BULK')
      order by module
    `
  );

  return res.rows.map((row) => ({
    module: row.module,
    dataEntryUserIds: Array.isArray(row.dataEntryUserIds) ? row.dataEntryUserIds : [],
    verificationUserIds: Array.isArray(row.verificationUserIds) ? row.verificationUserIds : [],
  }));
}

async function removeAdminWorkflowAssignments(client: Client) {
  const current = await snapshotWorkflowSettings(client);
  for (const row of current) {
    await client.query(
      `
        update marks_workflow_settings
        set
          data_entry_user_ids = $2::jsonb,
          verification_user_ids = $3::jsonb,
          updated_at = now()
        where module = $1
      `,
      [
        row.module,
        JSON.stringify(row.dataEntryUserIds.filter((id) => id !== ADMIN_USER_ID)),
        JSON.stringify(row.verificationUserIds.filter((id) => id !== ADMIN_USER_ID)),
      ]
    );
  }
}

async function restoreWorkflowSettings(client: Client, snapshots: WorkflowSettingsSnapshot[]) {
  for (const row of snapshots) {
    await client.query(
      `
        update marks_workflow_settings
        set
          data_entry_user_ids = $2::jsonb,
          verification_user_ids = $3::jsonb,
          updated_at = now()
        where module = $1
      `,
      [
        row.module,
        JSON.stringify(row.dataEntryUserIds),
        JSON.stringify(row.verificationUserIds),
      ]
    );
  }
}

async function loadRuntimeTargets(context: BrowserContext): Promise<RuntimeTargets> {
  const [coursesResponse, ocResponse] = await Promise.all([
    context.request.get("/api/v1/admin/courses"),
    context.request.get("/api/v1/oc"),
  ]);

  expect(coursesResponse.ok()).toBeTruthy();
  expect(ocResponse.ok()).toBeTruthy();

  const coursesPayload = (await coursesResponse.json()) as {
    items?: Array<{ id: string }>;
  };
  const ocPayload = (await ocResponse.json()) as {
    items?: Array<{ id: string }>;
  };

  const courseId = coursesPayload.items?.[0]?.id;
  const ocId = ocPayload.items?.[0]?.id;

  expect(courseId, "Expected at least one course for live module-access verification.").toBeTruthy();
  expect(ocId, "Expected at least one OC for live module-access verification.").toBeTruthy();

  return {
    courseId: courseId!,
    ocId: ocId!,
  };
}

async function openModuleAccessSettings(page: Page) {
  await page.goto("/dashboard/genmgmt?tab=settings");
  await expect(page).toHaveURL(`${BASE_URL}/dashboard/genmgmt?tab=settings`);
  await page.locator('a[href="/dashboard/genmgmt/settings/module-access"]').click();
  await expect(page).toHaveURL(`${BASE_URL}/dashboard/genmgmt/settings/module-access`);
  await expect(page.getByRole("heading", { name: "Module Access Settings" }).first()).toBeVisible();
}

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function expectRedirectToDashboard(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`${escapeForRegex(BASE_URL)}/dashboard/?$`));
}

async function expectSidebarLink(page: Page, label: string, visible: boolean) {
  const link = page.locator("aside").getByRole("link", { name: label, exact: true });
  if (visible) {
    await expect(link).toHaveCount(1);
    await expect(link).toBeVisible();
    return;
  }

  await expect(link).toHaveCount(0);
}

async function setModuleToggle(page: Page, title: string, desired: boolean) {
  const card = page.locator('[data-slot="card"]').filter({ hasText: title }).first();
  const toggle = card.locator('[data-slot="switch"]');

  await expect(toggle).toBeVisible();

  const isChecked = (await toggle.getAttribute("aria-checked")) === "true";
  if (isChecked !== desired) {
    await toggle.click();
  }

  await expect(toggle).toHaveAttribute("aria-checked", desired ? "true" : "false");
}

async function saveModuleSettings(page: Page) {
  const saveButton = page.getByRole("button", { name: "Save Settings" });
  await expect(saveButton).toBeVisible();

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/admin/module-access") &&
        response.request().method() === "PUT" &&
        response.status() === 200
    ),
    saveButton.click(),
  ]);

  await expect(page.getByText("Module access settings saved.")).toBeVisible();
}

async function readNavigationSections(context: BrowserContext) {
  const response = await context.request.get("/api/v1/me/navigation");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    sections?: Array<{ key: string }>;
  };
  return (payload.sections ?? []).map((section) => section.key);
}

async function assertReportsApi(context: BrowserContext, courseId: string, expectedStatus: number) {
  const response = await context.request.get(
    `/api/v1/reports/metadata/course-semesters?courseId=${courseId}`
  );
  expect(response.status()).toBe(expectedStatus);
  if (expectedStatus === 403) {
    await expect
      .soft((await response.json()) as { error?: string })
      .toMatchObject({ error: "module_access_denied" });
  }
}

async function assertBulkApi(context: BrowserContext, ocId: string, expectedStatus: number) {
  const response = await context.request.get(`/api/v1/oc/academics/bulk?ocIds=${ocId}&semester=1`);
  expect(response.status()).toBe(expectedStatus);
  if (expectedStatus === 403) {
    await expect
      .soft((await response.json()) as { error?: string })
      .toMatchObject({ error: "module_access_denied" });
  }
}

async function assertDossierApi(context: BrowserContext, ocId: string, expectedStatus: number) {
  const response = await context.request.get(`/api/v1/oc/${ocId}/dossier-snapshot`);
  expect(response.status()).toBe(expectedStatus);
  if (expectedStatus === 403) {
    await expect
      .soft((await response.json()) as { error?: string })
      .toMatchObject({ error: "module_access_denied" });
  }
}

test.describe.configure({ mode: "serial" });

test("admin browser session is redirected away from super-admin-only module-access settings", async ({
  browser,
}) => {
  const adminContext = await createAuthedContext(browser, ADMIN_SESSION);

  try {
    const page = await adminContext.newPage();
    const response = await page.goto("/dashboard/genmgmt/settings/module-access");
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveURL(new RegExp(`${escapeForRegex(BASE_URL)}/dashboard/?$`));

    const apiResponse = await adminContext.request.get("/api/v1/admin/module-access");
    expect(apiResponse.status()).toBe(403);
    await expect
      .soft((await apiResponse.json()) as { message?: string })
      .toMatchObject({ message: "Super admin privileges required" });
  } finally {
    await adminContext.close();
  }
});

test("super admin module-access settings drive admin sidebar visibility and server-side access", async ({
  browser,
}) => {
  test.setTimeout(180_000);

  let moduleSettingsBefore: ModuleSettingsSnapshot = null;
  let workflowSettingsBefore: WorkflowSettingsSnapshot[] = [];
  let superContext: BrowserContext | null = null;
  let adminContext: BrowserContext | null = null;

  try {
    await withDb(async (client) => {
      moduleSettingsBefore = await snapshotModuleSettings(client);
      workflowSettingsBefore = await snapshotWorkflowSettings(client);
      await removeAdminWorkflowAssignments(client);
      await writeModuleSettings(client, {
        adminCanAccessDossier: false,
        adminCanAccessBulkUpload: false,
        adminCanAccessReports: false,
      });
    });

    superContext = await createAuthedContext(browser, SUPER_ADMIN_SESSION);
    adminContext = await createAuthedContext(browser, ADMIN_SESSION);

    const targets = await loadRuntimeTargets(superContext);
    const superPage = await superContext.newPage();

    await openModuleAccessSettings(superPage);
    await setModuleToggle(superPage, "Dossier Management", false);
    await setModuleToggle(superPage, "Bulk Upload", false);
    await setModuleToggle(superPage, "Reports", false);
    await saveModuleSettings(superPage);

    const adminPageOff = await adminContext.newPage();
    await adminPageOff.goto("/dashboard");
    await expect(adminPageOff).toHaveURL(`${BASE_URL}/dashboard`);

    const sectionsOff = await readNavigationSections(adminContext);
    expect(sectionsOff).not.toContain("dossier");
    expect(sectionsOff).not.toContain("bulk_upload");
    expect(sectionsOff).not.toContain("reports");

    await expectSidebarLink(adminPageOff, "Dossier Management", false);
    await expectSidebarLink(adminPageOff, "Bulk Upload", false);
    await expectSidebarLink(adminPageOff, "Reports", false);

    await expectRedirectToDashboard(adminPageOff, "/dashboard/reports");
    await expectRedirectToDashboard(adminPageOff, "/dashboard/bulk-upload");
    await expectRedirectToDashboard(adminPageOff, "/dashboard/manage-marks");
    await expectRedirectToDashboard(adminPageOff, "/dashboard/manage-pt-marks");
    await expectRedirectToDashboard(
      adminPageOff,
      `/dashboard/${targets.ocId}/milmgmt/dossier-snapshot?tab=basic-details`
    );

    await assertReportsApi(adminContext, targets.courseId, 403);
    await assertBulkApi(adminContext, targets.ocId, 403);
    await assertDossierApi(adminContext, targets.ocId, 403);

    await openModuleAccessSettings(superPage);
    await setModuleToggle(superPage, "Dossier Management", true);
    await setModuleToggle(superPage, "Bulk Upload", true);
    await setModuleToggle(superPage, "Reports", true);
    await saveModuleSettings(superPage);

    await adminContext.close();
    adminContext = await createAuthedContext(browser, ADMIN_SESSION);
    const adminPageOn = await adminContext.newPage();
    await adminPageOn.goto("/dashboard");
    await expect(adminPageOn).toHaveURL(`${BASE_URL}/dashboard`);

    const sectionsOn = await readNavigationSections(adminContext);
    expect(sectionsOn).toContain("dossier");
    expect(sectionsOn).toContain("bulk_upload");
    expect(sectionsOn).toContain("reports");

    await expectSidebarLink(adminPageOn, "Dossier Management", true);
    await expectSidebarLink(adminPageOn, "Bulk Upload", true);
    await expectSidebarLink(adminPageOn, "Reports", true);

    await adminPageOn.goto("/dashboard/reports");
    await expect(adminPageOn).toHaveURL(`${BASE_URL}/dashboard/reports`);

    await adminPageOn.goto("/dashboard/bulk-upload");
    await expect(adminPageOn).toHaveURL(`${BASE_URL}/dashboard/bulk-upload`);

    await adminPageOn.goto("/dashboard/manage-marks");
    await expect(adminPageOn).toHaveURL(`${BASE_URL}/dashboard/manage-marks`);

    await adminPageOn.goto("/dashboard/manage-pt-marks");
    await expect(adminPageOn).toHaveURL(`${BASE_URL}/dashboard/manage-pt-marks`);

    await adminPageOn.goto(
      `/dashboard/${targets.ocId}/milmgmt/dossier-snapshot?tab=basic-details`
    );
    await expect(adminPageOn).toHaveURL(
      new RegExp(
        `${escapeForRegex(BASE_URL)}/dashboard/${escapeForRegex(targets.ocId)}/milmgmt/dossier-snapshot`
      )
    );

    await assertReportsApi(adminContext, targets.courseId, 200);
    await assertBulkApi(adminContext, targets.ocId, 200);
    await assertDossierApi(adminContext, targets.ocId, 200);

    await openModuleAccessSettings(superPage);
    await setModuleToggle(superPage, "Dossier Management", true);
    await setModuleToggle(superPage, "Bulk Upload", true);
    await setModuleToggle(superPage, "Reports", false);
    await saveModuleSettings(superPage);

    await adminContext.close();
    adminContext = await createAuthedContext(browser, ADMIN_SESSION);
    const adminPageMixed = await adminContext.newPage();
    await adminPageMixed.goto("/dashboard");
    await expect(adminPageMixed).toHaveURL(`${BASE_URL}/dashboard`);

    const sectionsMixed = await readNavigationSections(adminContext);
    expect(sectionsMixed).toContain("dossier");
    expect(sectionsMixed).toContain("bulk_upload");
    expect(sectionsMixed).not.toContain("reports");

    await expectSidebarLink(adminPageMixed, "Dossier Management", true);
    await expectSidebarLink(adminPageMixed, "Bulk Upload", true);
    await expectSidebarLink(adminPageMixed, "Reports", false);

    await expectRedirectToDashboard(adminPageMixed, "/dashboard/reports");
    await adminPageMixed.goto("/dashboard/bulk-upload");
    await expect(adminPageMixed).toHaveURL(`${BASE_URL}/dashboard/bulk-upload`);
    await adminPageMixed.goto(
      `/dashboard/${targets.ocId}/milmgmt/dossier-snapshot?tab=basic-details`
    );
    await expect(adminPageMixed).toHaveURL(
      new RegExp(
        `${escapeForRegex(BASE_URL)}/dashboard/${escapeForRegex(targets.ocId)}/milmgmt/dossier-snapshot`
      )
    );

    await assertReportsApi(adminContext, targets.courseId, 403);
    await assertBulkApi(adminContext, targets.ocId, 200);
    await assertDossierApi(adminContext, targets.ocId, 200);
  } finally {
    if (adminContext) {
      await adminContext.close();
    }
    if (superContext) {
      await superContext.close();
    }

    await withDb(async (client) => {
      await restoreWorkflowSettings(client, workflowSettingsBefore);
      await restoreModuleSettings(client, moduleSettingsBefore);
    });
  }
});
