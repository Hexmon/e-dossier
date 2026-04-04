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

type RuntimeTargets = {
  courseCode: string;
  platoonName: string;
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
    throw new Error("ACCESS_TOKEN_PRIVATE_KEY is required for the live dossier basic-details test.");
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

async function loadRuntimeTargets(client: Client): Promise<RuntimeTargets> {
  const [courseRes, platoonRes] = await Promise.all([
    client.query(
      `
        select code
        from courses
        where deleted_at is null
        order by created_at asc nulls last, id asc
        limit 1
      `
    ),
    client.query(
      `
        select coalesce(name, key) as label
        from platoons
        where deleted_at is null
        order by created_at asc nulls last, id asc
        limit 1
      `
    ),
  ]);

  const courseCode = courseRes.rows[0]?.code as string | undefined;
  const platoonName = platoonRes.rows[0]?.label as string | undefined;

  if (!courseCode || !platoonName) {
    throw new Error("Missing course/platoon prerequisites for the live dossier basic-details test.");
  }

  return { courseCode, platoonName };
}

async function findOcIdByTesNo(client: Client, tesNo: string) {
  const res = await client.query(
    `
      select id
      from oc_cadets
      where oc_no = $1
      limit 1
    `,
    [tesNo]
  );

  return (res.rows[0]?.id as string | undefined) ?? null;
}

async function deleteOcByTesNo(client: Client, tesNo: string) {
  await client.query(`delete from oc_cadets where oc_no = $1`, [tesNo]);
}

test("bulk-uploaded OC core data renders across the dossier basic-details cluster and background tabs canonicalize cleanly", async ({
  browser,
}) => {
  test.setTimeout(90_000);

  const context = await createAuthedContext(browser, SUPER_ADMIN_SESSION);
  const runtime = await withDb(loadRuntimeTargets);
  const csrfToken = await bootstrapCsrf(context);
  const runId = Date.now();
  const tesNo = `PH4-${runId}`;
  const name = `Phase 4 OC ${runId}`;
  const email = `phase4.${runId}@example.com`;
  const pan = `PH4PAN${String(runId).slice(-4)}`;
  const aadhaar = `9${String(runId).padStart(11, "0").slice(-11)}`;
  const upsc = `UPSC-PH4-${runId}`;
  const pi = `PI-${String(runId).slice(-4)}`;
  let ocId: string | null = null;

  try {
    const uploadResponse = await context.request.post("/api/v1/oc/bulk-upload", {
      headers: {
        "X-CSRF-Token": csrfToken,
      },
      data: {
        rows: [
          {
            "Tes No": tesNo,
            Name: name,
            Course: runtime.courseCode,
            "Dt of Arrival": "2026-01-10",
            Platoon: runtime.platoonName,
            "E mail": email,
            "PAN Card No": pan,
            "Aadhar No": aadhaar,
            "UPSC Roll No": upsc,
            PI: pi,
            "Father's Name": "Phase Four Father",
            "Blood GP": "O+",
          },
        ],
      },
    });

    expect(uploadResponse.ok()).toBeTruthy();
    const uploadBody = await uploadResponse.json();
    expect(uploadBody.success).toBe(1);
    expect(uploadBody.failed).toBe(0);

    ocId = await withDb((client) => findOcIdByTesNo(client, tesNo));
    expect(ocId).toBeTruthy();

    const snapshotApiResponse = await context.request.get(`/api/v1/oc/${ocId}/dossier-snapshot`);
    expect(snapshotApiResponse.ok()).toBeTruthy();
    const snapshotApiBody = await snapshotApiResponse.json();
    expect(snapshotApiBody.data.name).toBe(name);
    expect(snapshotApiBody.data.tesNo).toBe(tesNo);
    expect(snapshotApiBody.data.pi).toBe(pi);

    const page = await context.newPage();

    await page.goto(`/dashboard/${ocId}/milmgmt/dossier-snapshot?tab=basic-details`);
    await expect(page).toHaveURL(`${BASE_URL}/dashboard/${ocId}/milmgmt/dossier-snapshot?tab=basic-details`);
    await expect(page.getByText("Officer Cadet Details")).toBeVisible();
    await expect(page.getByText(/Loading\.\.\./)).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText("No data available. Click Edit to add information.")).toHaveCount(0);
    await expect(page.getByText("No arrival photo")).toBeVisible();
    await expect(page.getByText("No departure photo")).toBeVisible();

    await page.goto(`/dashboard/${ocId}/milmgmt/dossier-filling?tab=basic-details`);
    await expect(page.getByText("Dossier Filling Data")).toBeVisible();
    await expect(page.getByText("No dossier data available.")).toHaveCount(0);
    await expect(page.getByText("Initiated By:", { exact: false })).toBeVisible();

    await page.goto(`/dashboard/${ocId}/milmgmt/pers-particulars?tab=basic-details`);
    await expect(page.getByRole("heading", { name: "Personal Particulars" })).toBeVisible();
    await expect(page.locator('input[name="pl"]')).toHaveValue(pi);
    await expect(page.locator('input[name="fatherName"]')).toHaveValue("Phase Four Father");

    await page.goto(`/dashboard/${ocId}/milmgmt/background-detls?tab=family-bgrnd`);
    await expect(page).toHaveURL(
      new RegExp(
        `${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/dashboard/${ocId}/milmgmt/background-detls\\?tab=basic-details&bgTab=family-bgrnd`
      )
    );
    await expect(page.getByRole("tab", { name: "Family Background" })).toHaveAttribute("data-state", "active");
    await page.getByRole("tab", { name: "Achievements" }).click();
    await expect(page).toHaveURL(
      new RegExp(
        `${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/dashboard/${ocId}/milmgmt/background-detls\\?tab=basic-details&bgTab=achievements`
      )
    );
    await page.getByRole("tab", { name: "Autobiography" }).click();
    await expect(page).toHaveURL(
      new RegExp(
        `${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/dashboard/${ocId}/milmgmt/background-detls\\?tab=basic-details&bgTab=auto-bio`
      )
    );
    await expect(page.getByText("Confidential – Autobiography Form")).toBeVisible();

    await page.goto(`/dashboard/${ocId}/milmgmt/ssb-reports?tab=basic-details`);
    await expect(page.getByText("Predictive Rating")).toBeVisible();
    await expect(page.getByText("Scope for Improvement")).toBeVisible();
  } finally {
    if (tesNo) {
      await withDb((client) => deleteOcByTesNo(client, tesNo));
    }
    await context.close();
  }
});
