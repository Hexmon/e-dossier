import "dotenv/config";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { Client } from "pg";

import { acquireLiveSuiteLock } from "./live-suite-lock";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

type SetupStatusResponse = {
  message?: string;
  setup: {
    bootstrapRequired: boolean;
    setupComplete: boolean;
    nextStep: "superAdmin" | "platoons" | "hierarchy" | "courses" | "offerings" | "ocs" | null;
    counts: {
      activeSuperAdmins: number;
      activePlatoons: number;
      activeCourses: number;
      activeOfferings: number;
      activeOCs: number;
      activeHierarchyNodes: number;
      activeRootNodes: number;
      missingPlatoonHierarchyNodes: number;
    };
    steps: Record<
      "superAdmin" | "platoons" | "hierarchy" | "courses" | "offerings" | "ocs",
      { status: "complete" | "pending" | "blocked"; complete: boolean }
    >;
  };
};

type SetupStateSnapshot = {
  superAdminAppointments: Array<{
    id: string;
    endsAt: string | null;
    deletedAt: string | null;
  }>;
  platoons: Array<{
    id: string;
    deletedAt: string | null;
  }>;
  hierarchyNodes: Array<{
    id: string;
    deletedAt: string | null;
  }>;
  courses: Array<{
    id: string;
    deletedAt: string | null;
  }>;
  offerings: Array<{
    id: string;
    deletedAt: string | null;
  }>;
  ocs: Array<{
    id: string;
    deletedAt: string | null;
    status: string | null;
  }>;
};

type CreatedSetupResources = {
  userId: string | null;
  appointmentId: string | null;
  platoonId: string | null;
  hierarchyNodeId: string | null;
  courseId: string | null;
  subjectId: string | null;
  offeringId: string | null;
  ocId: string | null;
  tesNo: string | null;
};

let releaseLiveSuiteLock: null | (() => Promise<void>) = null;

test.beforeAll(async () => {
  releaseLiveSuiteLock = await acquireLiveSuiteLock();
});

test.afterAll(async () => {
  await releaseLiveSuiteLock?.();
  releaseLiveSuiteLock = null;
});

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function snapshotSetupState(client: Client): Promise<SetupStateSnapshot> {
  const [superAdminAppointments, platoonRows, hierarchyRows, courseRows, offeringRows, ocRows] =
    await Promise.all([
      client.query(
        `
          select
            a.id,
            a.ends_at as "endsAt",
            a.deleted_at as "deletedAt"
          from appointments a
          inner join positions p on p.id = a.position_id
          where p.key = 'SUPER_ADMIN'
            and a.deleted_at is null
            and a.ends_at is null
        `
      ),
      client.query(
        `
          select id, deleted_at as "deletedAt"
          from platoons
          where deleted_at is null
        `
      ),
      client.query(
        `
          select id, deleted_at as "deletedAt"
          from org_hierarchy_nodes
          where deleted_at is null
            and node_type <> 'ROOT'
        `
      ),
      client.query(
        `
          select id, deleted_at as "deletedAt"
          from courses
          where deleted_at is null
        `
      ),
      client.query(
        `
          select id, deleted_at as "deletedAt"
          from course_offerings
          where deleted_at is null
        `
      ),
      client.query(
        `
          select id, deleted_at as "deletedAt", status
          from oc_cadets
          where deleted_at is null
        `
      ),
    ]);

  return {
    superAdminAppointments: superAdminAppointments.rows,
    platoons: platoonRows.rows,
    hierarchyNodes: hierarchyRows.rows,
    courses: courseRows.rows,
    offerings: offeringRows.rows,
    ocs: ocRows.rows,
  };
}

async function prepareFreshLikeState(client: Client, snapshot: SetupStateSnapshot) {
  if (snapshot.superAdminAppointments.length > 0) {
    await client.query(
      `
        update appointments
        set ends_at = now()
        where id = any($1::uuid[])
      `,
      [snapshot.superAdminAppointments.map((row) => row.id)]
    );
  }

  if (snapshot.platoons.length > 0) {
    await client.query(
      `
        update platoons
        set deleted_at = now()
        where id = any($1::uuid[])
      `,
      [snapshot.platoons.map((row) => row.id)]
    );
  }

  if (snapshot.hierarchyNodes.length > 0) {
    await client.query(
      `
        update org_hierarchy_nodes
        set deleted_at = now()
        where id = any($1::uuid[])
      `,
      [snapshot.hierarchyNodes.map((row) => row.id)]
    );
  }

  if (snapshot.courses.length > 0) {
    await client.query(
      `
        update courses
        set deleted_at = now()
        where id = any($1::uuid[])
      `,
      [snapshot.courses.map((row) => row.id)]
    );
  }

  if (snapshot.offerings.length > 0) {
    await client.query(
      `
        update course_offerings
        set deleted_at = now()
        where id = any($1::uuid[])
      `,
      [snapshot.offerings.map((row) => row.id)]
    );
  }

  if (snapshot.ocs.length > 0) {
    await client.query(
      `
        update oc_cadets
        set deleted_at = now(), status = 'INACTIVE'
        where id = any($1::uuid[])
      `,
      [snapshot.ocs.map((row) => row.id)]
    );
  }
}

async function cleanupCreatedResources(client: Client, created: CreatedSetupResources) {
  if (created.ocId) {
    await client.query(`delete from oc_personal where oc_id = $1`, [created.ocId]);
    await client.query(`delete from oc_cadets where id = $1`, [created.ocId]);
  } else if (created.tesNo) {
    const ocRes = await client.query(`select id from oc_cadets where oc_no = $1 limit 1`, [created.tesNo]);
    const ocId = (ocRes.rows[0]?.id as string | undefined) ?? null;
    if (ocId) {
      await client.query(`delete from oc_personal where oc_id = $1`, [ocId]);
      await client.query(`delete from oc_cadets where id = $1`, [ocId]);
    }
  }

  if (created.offeringId) {
    await client.query(`delete from course_offerings where id = $1`, [created.offeringId]);
  }

  if (created.subjectId) {
    await client.query(`delete from subjects where id = $1`, [created.subjectId]);
  }

  if (created.courseId) {
    await client.query(`delete from courses where id = $1`, [created.courseId]);
  }

  if (created.hierarchyNodeId) {
    await client.query(`delete from org_hierarchy_nodes where id = $1`, [created.hierarchyNodeId]);
  }

  if (created.platoonId) {
    await client.query(`delete from platoons where id = $1`, [created.platoonId]);
  }

  if (created.appointmentId) {
    await client.query(`delete from appointments where id = $1`, [created.appointmentId]);
  }

  if (created.userId) {
    await client.query(`delete from credentials_local where user_id = $1`, [created.userId]);
    await client.query(`delete from users where id = $1`, [created.userId]);
  }
}

async function restoreSetupState(client: Client, snapshot: SetupStateSnapshot) {
  if (snapshot.superAdminAppointments.length > 0) {
    for (const row of snapshot.superAdminAppointments) {
      await client.query(
        `
          update appointments
          set ends_at = $2::timestamptz, deleted_at = $3::timestamptz
          where id = $1::uuid
        `,
        [row.id, row.endsAt, row.deletedAt]
      );
    }
  }

  if (snapshot.platoons.length > 0) {
    await client.query(
      `
        update platoons
        set deleted_at = null
        where id = any($1::uuid[])
      `,
      [snapshot.platoons.map((row) => row.id)]
    );
  }

  if (snapshot.hierarchyNodes.length > 0) {
    await client.query(
      `
        update org_hierarchy_nodes
        set deleted_at = null
        where id = any($1::uuid[])
      `,
      [snapshot.hierarchyNodes.map((row) => row.id)]
    );
  }

  if (snapshot.courses.length > 0) {
    await client.query(
      `
        update courses
        set deleted_at = null
        where id = any($1::uuid[])
      `,
      [snapshot.courses.map((row) => row.id)]
    );
  }

  if (snapshot.offerings.length > 0) {
    await client.query(
      `
        update course_offerings
        set deleted_at = null
        where id = any($1::uuid[])
      `,
      [snapshot.offerings.map((row) => row.id)]
    );
  }

  if (snapshot.ocs.length > 0) {
    for (const row of snapshot.ocs) {
      await client.query(
        `
          update oc_cadets
          set deleted_at = $2::timestamptz, status = $3
          where id = $1::uuid
        `,
        [row.id, row.deletedAt, row.status]
      );
    }
  }
}

async function getSetupStatus(context: BrowserContext): Promise<SetupStatusResponse["setup"]> {
  const response = await context.request.get("/api/v1/setup/status");
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as SetupStatusResponse;
  return body.setup;
}

async function bootstrapCsrf(context: BrowserContext) {
  const response = await context.request.get("/api/v1/me");
  expect(response.ok()).toBeTruthy();
  const cookies = await context.cookies(BASE_URL);
  const csrfCookie = cookies.find((cookie) => cookie.name === "csrf-token");
  if (!csrfCookie?.value) {
    throw new Error("Expected a csrf-token cookie after an authenticated API GET.");
  }
  return csrfCookie.value;
}

async function expectSetupStep(context: BrowserContext, nextStep: SetupStatusResponse["setup"]["nextStep"]) {
  const setup = await getSetupStatus(context);
  expect(setup.nextStep).toBe(nextStep);
  return setup;
}

async function bootstrapSuperAdminThroughUi(page: Page, runId: number) {
  const username = `setupph7${runId}`;
  const password = `SetupPass!${String(runId).slice(-4)}`;
  const email = `setup.ph7.${runId}@example.mil`;

  await page.locator("#setup-username").fill(username);
  await page.locator("#setup-email").fill(email);
  await page.locator("#setup-password").fill(password);
  await page.locator("#setup-password-confirm").fill(password);
  await page.locator("#setup-name").fill(`Phase 7 Admin ${runId}`);
  await page.locator("#setup-rank").fill("SUPER");
  await page.locator("#setup-phone").fill(`9000${String(runId).slice(-6)}`);

  await page.getByRole("button", { name: "Create Super Admin" }).click();
  await expect(page.getByRole("heading", { name: "Initial System Setup" })).toBeVisible({
    timeout: 20_000,
  });

  return { username, password, email };
}

test("fresh setup can be bootstrapped coherently through /setup and reaches complete state", async ({
  browser,
}) => {
  test.setTimeout(180_000);

  const runId = Date.now();
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  const created: CreatedSetupResources = {
    userId: null,
    appointmentId: null,
    platoonId: null,
    hierarchyNodeId: null,
    courseId: null,
    subjectId: null,
    offeringId: null,
    ocId: null,
    tesNo: null,
  };
  const snapshot = await withDb(snapshotSetupState);

  try {
    await withDb((client) => prepareFreshLikeState(client, snapshot));

    await page.goto("/login");
    await expect(page.getByText("Initial setup required")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open First-Run Setup" })).toBeVisible();

    await page.goto("/setup");
    await expect(page.getByText("Initial Super Admin Setup")).toBeVisible();

    const bootstrapIdentity = await bootstrapSuperAdminThroughUi(page, runId);

    const meResponse = await context.request.get("/api/v1/me");
    expect(meResponse.ok()).toBeTruthy();
    const meBody = await meResponse.json();
    created.userId = meBody.user?.id ?? null;
    created.appointmentId = meBody.appointment?.id ?? meBody.apt?.id ?? null;
    expect(created.userId).toBeTruthy();
    expect(created.appointmentId).toBeTruthy();

    const disabledBootstrapResponse = await context.request.post("/api/v1/bootstrap/super-admin", {
      data: {
        username: `second${runId}`,
        email: `second.${runId}@example.mil`,
        password: "AnotherPass!1",
      },
    });
    expect(disabledBootstrapResponse.status()).toBe(409);
    const disabledBootstrapBody = await disabledBootstrapResponse.json();
    expect(disabledBootstrapBody.error).toBe("bootstrap_disabled");

    let setup = await expectSetupStep(context, "platoons");
    expect(setup.bootstrapRequired).toBe(false);

    await page.getByRole("link", { name: "Open Platoon Management" }).click();
    await expect(page).toHaveURL(new RegExp("/dashboard/genmgmt/platoon-management\\?returnTo=%2Fsetup$"));
    await expect(page.getByText("Return to Setup")).toBeVisible();
    await page.getByRole("link", { name: "Return to Setup" }).click();
    await expect(page).toHaveURL(`${BASE_URL}/setup`);

    const csrfToken = await bootstrapCsrf(context);

    const platoonResponse = await context.request.post("/api/v1/platoons", {
      headers: {
        "X-CSRF-Token": csrfToken,
      },
      data: {
        key: `PH7PL${String(runId).slice(-4)}`,
        name: `Phase 7 Platoon ${runId}`,
        about: "Phase 7 setup live test platoon",
      },
    });
    expect(platoonResponse.ok()).toBeTruthy();
    const platoonBody = await platoonResponse.json();
    created.platoonId = platoonBody.platoon?.id ?? null;

    setup = await expectSetupStep(context, "hierarchy");
    expect(setup.counts.activePlatoons).toBe(1);
    expect(setup.counts.missingPlatoonHierarchyNodes).toBe(1);

    await page.goto("/setup");
    await page.getByRole("button", { name: "Create Missing Platoon Nodes" }).click();
    await expect.poll(async () => (await getSetupStatus(context)).counts.missingPlatoonHierarchyNodes).toBe(0);
    setup = await expectSetupStep(context, "courses");
    expect(setup.steps.hierarchy.status).toBe("complete");

    const hierarchyNodeLookup = await withDb(async (client) => {
      if (!created.platoonId) {
        throw new Error("Expected created platoon id before syncing hierarchy.");
      }

      const res = await client.query(
        `
          select id
          from org_hierarchy_nodes
          where platoon_id = $1
            and deleted_at is null
          order by created_at desc nulls last
          limit 1
        `,
        [created.platoonId]
      );
      return (res.rows[0]?.id as string | undefined) ?? null;
    });
    created.hierarchyNodeId = hierarchyNodeLookup;

    const courseResponse = await context.request.post("/api/v1/admin/courses", {
      headers: {
        "X-CSRF-Token": csrfToken,
      },
      data: {
        code: `PH7-${String(runId).slice(-6)}`,
        title: `Phase 7 Course ${runId}`,
      },
    });
    expect(courseResponse.ok()).toBeTruthy();
    const courseBody = await courseResponse.json();
    created.courseId = courseBody.course?.id ?? null;
    expect(created.courseId).toBeTruthy();

    setup = await expectSetupStep(context, "offerings");
    expect(setup.counts.activeCourses).toBe(1);

    const subjectResponse = await context.request.post("/api/v1/admin/subjects", {
      headers: {
        "X-CSRF-Token": csrfToken,
      },
      data: {
        code: `PH7SUB-${String(runId).slice(-5)}`,
        name: `Phase 7 Subject ${runId}`,
        branch: "C",
        noOfPeriods: 4,
        hasTheory: true,
        hasPractical: false,
        defaultTheoryCredits: 4,
      },
    });
    expect(subjectResponse.ok()).toBeTruthy();
    const subjectBody = await subjectResponse.json();
    created.subjectId = subjectBody.subject?.id ?? null;
    expect(created.subjectId).toBeTruthy();

    if (!created.courseId || !created.subjectId) {
      throw new Error("Expected created course and subject ids before creating the offering.");
    }

    const offeringResponse = await context.request.post(
      `/api/v1/admin/courses/${created.courseId}/offerings`,
      {
        headers: {
          "X-CSRF-Token": csrfToken,
        },
        data: {
          subjectId: created.subjectId,
          semester: 1,
          includeTheory: true,
          includePractical: false,
          theoryCredits: 4,
        },
      }
    );
    expect(offeringResponse.ok()).toBeTruthy();
    const offeringBody = await offeringResponse.json();
    created.offeringId = offeringBody.offeringId ?? null;
    expect(created.offeringId).toBeTruthy();

    setup = await expectSetupStep(context, "ocs");
    expect(setup.counts.activeOfferings).toBe(1);

    created.tesNo = `PH7OC-${runId}`;
    const bulkUploadResponse = await context.request.post("/api/v1/oc/bulk-upload", {
      headers: {
        "X-CSRF-Token": csrfToken,
      },
      data: {
        rows: [
          {
            "Tes No": created.tesNo,
            Name: `Phase 7 OC ${runId}`,
            Course: `PH7-${String(runId).slice(-6)}`,
            "Dt of Arrival": "2026-01-05",
            Platoon: `PH7PL${String(runId).slice(-4)}`,
            "E mail": `phase7.oc.${runId}@example.mil`,
            "PAN Card No": `PH7PAN${String(runId).slice(-4)}`,
            "Aadhar No": `8${String(runId).padStart(11, "0").slice(-11)}`,
            "UPSC Roll No": `PH7UPSC${String(runId).slice(-5)}`,
          },
        ],
      },
    });
    expect(bulkUploadResponse.ok()).toBeTruthy();
    const bulkBody = await bulkUploadResponse.json();
    expect(bulkBody.success).toBe(1);
    expect(bulkBody.failed).toBe(0);

    created.ocId = await withDb(async (client) => {
      const res = await client.query(`select id from oc_cadets where oc_no = $1 limit 1`, [created.tesNo]);
      return (res.rows[0]?.id as string | undefined) ?? null;
    });
    expect(created.ocId).toBeTruthy();

    setup = await getSetupStatus(context);
    expect(setup.setupComplete).toBe(true);
    expect(setup.nextStep).toBeNull();
    expect(setup.counts.activeOCs).toBe(1);

    await page.goto("/setup");
    await expect(page).toHaveURL(`${BASE_URL}/dashboard/genmgmt`);
    await expect(page.getByText("General Management")).toBeVisible();

    expect(bootstrapIdentity.username).toContain("setupph7");
    expect(bootstrapIdentity.password).toContain("SetupPass!");
    expect(bootstrapIdentity.email).toContain("@example.mil");
  } finally {
    await withDb(async (client) => {
      await cleanupCreatedResources(client, created);
      await restoreSetupState(client, snapshot);
    });
    await context.close();
  }
});
