import "dotenv/config";
import { test, expect, type Browser, type Page } from "@playwright/test";
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

async function signAccessToken() {
  const privateKeyPem = normalizePem(process.env.ACCESS_TOKEN_PRIVATE_KEY);
  if (!privateKeyPem) {
    throw new Error("ACCESS_TOKEN_PRIVATE_KEY is required for OC zero-loss live smoke.");
  }

  const privateKey = await importPKCS8(privateKeyPem, "EdDSA");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    roles: SUPER_ADMIN_SESSION.roles,
    apt: SUPER_ADMIN_SESSION.apt,
    pwd_at: null,
  })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(SUPER_ADMIN_SESSION.userId)
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + 900)
    .sign(privateKey);
}

async function createAuthedPage(browser: Browser) {
  const token = await signAccessToken();
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

  return context.newPage();
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

async function selectExistingOcId() {
  return withDb(async (client) => {
    const result = await client.query<{ id: string }>(
      `
        select id
        from oc_cadets
        where deleted_at is null
        order by created_at asc nulls last, id asc
        limit 1
      `
    );
    const ocId = result.rows[0]?.id;
    if (!ocId) throw new Error("No active OC exists for OC zero-loss live smoke.");
    return ocId;
  });
}

async function assertPageLoads(page: Page, route: string) {
  const consoleErrors: string[] = [];
  const failedApiCalls: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/api/") && response.status() >= 400) {
      failedApiCalls.push(`${response.status()} ${url}`);
    }
  });

  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `${route} should return a successful document response`).toBeLessThan(400);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);

  expect(consoleErrors, `${route} console errors`).toEqual([]);
  expect(failedApiCalls, `${route} failed API calls`).toEqual([]);
}

test("OC zero-loss affected pages load without console/API errors", async ({ browser }) => {
  test.setTimeout(120_000);

  const ocId = await selectExistingOcId();
  const page = await createAuthedPage(browser);

  const routes = [
    "/dashboard/genmgmt/ocmgmt",
    "/dashboard/bulk-upload",
    `/dashboard/${ocId}/milmgmt/dossier-snapshot`,
    `/dashboard/${ocId}/milmgmt/academics`,
    `/dashboard/${ocId}/milmgmt/semester-record`,
    `/dashboard/${ocId}/milmgmt/physical-training`,
    `/dashboard/${ocId}/milmgmt/med-record`,
    `/dashboard/${ocId}/milmgmt/discip-records`,
    `/dashboard/${ocId}/milmgmt/performance-graph`,
  ];

  for (const route of routes) {
    await assertPageLoads(page, route);
  }
});
