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
const SEMESTER_OVERRIDE_REASON_HEADER = "X-Semester-Override-Reason";
const ARJUN_SCOPE_ID = "0d95a05c-6064-4fb5-9566-df8e60dfee81";
const SUPERADMIN_USER_ID = "a5b41269-a5a0-4ff8-8de0-a76d45299be8";
const ADMIN_USER_ID = "312d3216-7ff0-4663-b270-f181d8f29039";

const SUPER_ADMIN_SESSION = {
  userId: SUPERADMIN_USER_ID,
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

const ARJUN_SESSION = {
  userId: "8bf30fde-3cec-4b28-b2a8-1377da9d428a",
  roles: ["arjunplcdr", "PLATOON_COMMANDER_EQUIVALENT"],
  apt: {
    id: "c3e284e7-84f0-473f-9062-f4d67a393c14",
    position: "arjunplcdr",
    scope: { type: "PLATOON", id: ARJUN_SCOPE_ID },
    valid_from: "2026-03-04T00:00:00.000Z",
    valid_to: null as string | null,
  },
};

type Session = typeof SUPER_ADMIN_SESSION | typeof ADMIN_SESSION | typeof ARJUN_SESSION;

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

type RuntimeTargets = {
  inScopeOcId: string;
  foreignOcId: string;
  currentSemester: number;
  historicalSemester: number;
};

type OverrideAuditRow = {
  action: string;
  actorId: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function signAccessToken(session: Session) {
  const privateKeyPem = normalizePem(process.env.ACCESS_TOKEN_PRIVATE_KEY);
  if (!privateKeyPem) {
    throw new Error("ACCESS_TOKEN_PRIVATE_KEY is required for the live semester-lock test.");
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

async function loadRuntimeTargets(client: Client): Promise<RuntimeTargets> {
  const res = await client.query(
    `
      with course_semesters as (
        select
          course_id,
          coalesce(max(semester), 1) as current_semester
        from course_offerings
        where deleted_at is null
        group by course_id
      )
      select
        oc.id,
        oc.platoon_id as "platoonId",
        coalesce(cs.current_semester, 1) as "currentSemester"
      from oc_cadets oc
      left join course_semesters cs on cs.course_id = oc.course_id
      order by oc.created_at asc nulls last, oc.id asc
    `
  );

  const rows = res.rows as Array<{
    id: string;
    platoonId: string | null;
    currentSemester: number;
  }>;

  const inScope = rows.find(
    (row) => row.platoonId === ARJUN_SCOPE_ID && Number(row.currentSemester) >= 2
  );
  const foreign = rows.find((row) => row.platoonId && row.platoonId !== ARJUN_SCOPE_ID);

  if (!inScope || !foreign) {
    throw new Error("Missing semester-lock live test prerequisites in the local database.");
  }

  return {
    inScopeOcId: inScope.id,
    foreignOcId: foreign.id,
    currentSemester: Number(inScope.currentSemester),
    historicalSemester: Number(inScope.currentSemester) - 1,
  };
}

async function deleteMedicalsByIds(client: Client, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return;
  await client.query(`delete from oc_medicals where id = any($1::uuid[])`, [uniqueIds]);
}

async function waitForOverrideAuditEvent(
  client: Client,
  params: {
    actorId: string;
    targetId: string;
    overrideReason: string;
    requestedSemester: number;
    notBeforeIso: string;
  }
): Promise<OverrideAuditRow> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const res = await client.query(
      `
        select
          action,
          actor_id as "actorId",
          target_id as "targetId",
          metadata
        from audit_events
        where
          action = 'OC.SEMESTER_OVERRIDE'
          and actor_id = $1
          and target_id = $2
          and occurred_at >= $3::timestamptz
        order by occurred_at desc
        limit 5
      `,
      [params.actorId, params.targetId, params.notBeforeIso]
    );

    const match = (res.rows as OverrideAuditRow[]).find((row) => {
      const metadata = row.metadata ?? {};
      return (
        String(metadata.overrideReason ?? "") === params.overrideReason &&
        Number(metadata.requestedSemester ?? NaN) === params.requestedSemester
      );
    });

    if (match) {
      return match;
    }

    await sleep(500);
  }

  throw new Error("Timed out waiting for the OC.SEMESTER_OVERRIDE audit event.");
}

test("semester lock, medical restrictions, override audit, and legacy semester params behave consistently", async ({
  browser,
}) => {
  test.setTimeout(90_000);

  const originalModuleSettings = await withDb(snapshotModuleSettings);
  const runtime = await withDb(loadRuntimeTargets);
  const commanderContext = await createAuthedContext(browser, ARJUN_SESSION);
  const adminContext = await createAuthedContext(browser, ADMIN_SESSION);
  const superContext = await createAuthedContext(browser, SUPER_ADMIN_SESSION);
  const createdMedicalIds: string[] = [];
  const runId = Date.now();
  const currentMedicalHistory = `Phase 5 current medical ${runId}`;
  const historicalMedicalHistory = `Phase 5 historical medical ${runId}`;
  const overrideReason = `Phase 5 override reason ${runId}`;

  try {
    await withDb((client) =>
      writeModuleSettings(client, {
        adminCanAccessDossier: true,
        adminCanAccessBulkUpload: originalModuleSettings?.adminCanAccessBulkUpload ?? false,
        adminCanAccessReports: originalModuleSettings?.adminCanAccessReports ?? false,
      })
    );

    const [commanderCsrf, adminCsrf, superCsrf] = await Promise.all([
      bootstrapCsrf(commanderContext),
      bootstrapCsrf(adminContext),
      bootstrapCsrf(superContext),
    ]);

    const commanderPage = await commanderContext.newPage();
    await commanderPage.goto(
      `/dashboard/${runtime.inScopeOcId}/milmgmt/med-record?semister=${runtime.historicalSemester}`
    );
    await expect(commanderPage).toHaveURL(
      new RegExp(
        `${escapeRegex(BASE_URL)}/dashboard/${runtime.inScopeOcId}/milmgmt/med-record\\?semester=${runtime.historicalSemester}$`
      )
    );
    await expect(
      commanderPage.getByText(`Semester ${runtime.historicalSemester} is read-only.`, {
        exact: false,
      })
    ).toBeVisible({ timeout: 15_000 });

    const superPage = await superContext.newPage();
    await superPage.goto(
      `/dashboard/${runtime.inScopeOcId}/milmgmt/med-record?sem=${runtime.historicalSemester}`
    );
    await expect(superPage).toHaveURL(
      new RegExp(
        `${escapeRegex(BASE_URL)}/dashboard/${runtime.inScopeOcId}/milmgmt/med-record\\?semester=${runtime.historicalSemester}$`
      )
    );
    await expect(superPage.getByText(/override reason/i)).toBeVisible({ timeout: 15_000 });
    await expect(superPage.getByText(/audited/i)).toBeVisible();

    const commanderCurrentResponse = await commanderContext.request.post(
      `/api/v1/oc/${runtime.inScopeOcId}/medical`,
      {
        headers: {
          "X-CSRF-Token": commanderCsrf,
        },
        data: {
          semester: runtime.currentSemester,
          date: "2026-04-05T00:00:00.000Z",
          medicalHistory: currentMedicalHistory,
        },
      }
    );
    expect(commanderCurrentResponse.ok()).toBeTruthy();
    const commanderCurrentBody = await commanderCurrentResponse.json();
    createdMedicalIds.push(String(commanderCurrentBody.data.id));

    const commanderHistoricalMedical = await commanderContext.request.post(
      `/api/v1/oc/${runtime.inScopeOcId}/medical`,
      {
        headers: {
          "X-CSRF-Token": commanderCsrf,
        },
        data: {
          semester: runtime.historicalSemester,
          date: "2026-04-05T00:00:00.000Z",
          medicalHistory: historicalMedicalHistory,
        },
      }
    );
    expect(commanderHistoricalMedical.status()).toBe(403);
    await expect
      .soft((await commanderHistoricalMedical.json()) as { error?: string })
      .toMatchObject({ error: "semester_locked" });

    const adminCurrentMedical = await adminContext.request.post(
      `/api/v1/oc/${runtime.inScopeOcId}/medical`,
      {
        headers: {
          "X-CSRF-Token": adminCsrf,
        },
        data: {
          semester: runtime.currentSemester,
          date: "2026-04-05T00:00:00.000Z",
          medicalHistory: `Phase 5 admin denial ${runId}`,
        },
      }
    );
    expect(adminCurrentMedical.status()).toBe(403);
    await expect
      .soft((await adminCurrentMedical.json()) as { message?: string })
      .toMatchObject({
        message: "Medical updates are restricted to the commander-equivalent role for this platoon.",
      });

    const foreignMedicalRead = await commanderContext.request.get(
      `/api/v1/oc/${runtime.foreignOcId}/medical`
    );
    expect(foreignMedicalRead.status()).toBe(403);

    const legacyPtRead = await commanderContext.request.get(
      `/api/v1/oc/${runtime.inScopeOcId}/physical-training?sem=${runtime.historicalSemester}`
    );
    expect(legacyPtRead.ok()).toBeTruthy();

    const legacySprHistoricalWrite = await commanderContext.request.patch(
      `/api/v1/oc/${runtime.inScopeOcId}/spr?semister=${runtime.historicalSemester}`,
      {
        headers: {
          "X-CSRF-Token": commanderCsrf,
        },
        data: {},
      }
    );
    expect(legacySprHistoricalWrite.status()).toBe(403);
    await expect
      .soft((await legacySprHistoricalWrite.json()) as { error?: string })
      .toMatchObject({ error: "semester_locked" });

    const superHistoricalWithoutReason = await superContext.request.post(
      `/api/v1/oc/${runtime.inScopeOcId}/medical`,
      {
        headers: {
          "X-CSRF-Token": superCsrf,
        },
        data: {
          semester: runtime.historicalSemester,
          date: "2026-04-05T00:00:00.000Z",
          medicalHistory: historicalMedicalHistory,
        },
      }
    );
    expect(superHistoricalWithoutReason.status()).toBe(400);
    await expect
      .soft((await superHistoricalWithoutReason.json()) as { error?: string })
      .toMatchObject({ error: "override_reason_required" });

    const auditStartIso = new Date().toISOString();
    const superHistoricalWithReason = await superContext.request.post(
      `/api/v1/oc/${runtime.inScopeOcId}/medical`,
      {
        headers: {
          "X-CSRF-Token": superCsrf,
          [SEMESTER_OVERRIDE_REASON_HEADER]: overrideReason,
        },
        data: {
          semester: runtime.historicalSemester,
          date: "2026-04-05T00:00:00.000Z",
          medicalHistory: `${historicalMedicalHistory} override`,
        },
      }
    );
    expect(superHistoricalWithReason.ok()).toBeTruthy();
    const superHistoricalBody = await superHistoricalWithReason.json();
    createdMedicalIds.push(String(superHistoricalBody.data.id));

    const overrideAudit = await withDb((client) =>
      waitForOverrideAuditEvent(client, {
        actorId: SUPERADMIN_USER_ID,
        targetId: runtime.inScopeOcId,
        overrideReason,
        requestedSemester: runtime.historicalSemester,
        notBeforeIso: auditStartIso,
      })
    );
    expect(overrideAudit.action).toBe("OC.SEMESTER_OVERRIDE");
    expect(String(overrideAudit.metadata?.overrideReason ?? "")).toBe(overrideReason);
  } finally {
    await withDb(async (client) => {
      await deleteMedicalsByIds(client, createdMedicalIds);
      await restoreModuleSettings(client, originalModuleSettings);
    });

    await commanderContext.close();
    await adminContext.close();
    await superContext.close();
  }
});
