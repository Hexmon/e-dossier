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
const ARJUN_PLATOON_ID = "0d95a05c-6064-4fb5-9566-df8e60dfee81";
const ARJUN_APPOINTMENT_ID = "c3e284e7-84f0-473f-9062-f4d67a393c14";
const SUPERADMIN_USER_ID = "a5b41269-a5a0-4ff8-8de0-a76d45299be8";

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

type Session = typeof SUPER_ADMIN_SESSION;

type MappingSnapshot = {
  capabilityKey: string;
  positionId: string | null;
  updatedBy: string | null;
} | null;

type RuntimeTargets = {
  rootNodeId: string;
  arjunPositionId: string;
  arjunPositionLabel: string;
  arjunOcId: string;
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
    throw new Error("ACCESS_TOKEN_PRIVATE_KEY is required for the live hierarchy/delegation test.");
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

async function snapshotMapping(client: Client): Promise<MappingSnapshot> {
  const res = await client.query(
    `
      select capability_key as "capabilityKey", position_id as "positionId", updated_by as "updatedBy"
      from functional_role_mappings
      where capability_key = 'PLATOON_COMMANDER_EQUIVALENT'
      limit 1
    `
  );

  return res.rows[0] ?? null;
}

async function restoreMapping(client: Client, snapshot: MappingSnapshot) {
  if (!snapshot) {
    await client.query(
      `delete from functional_role_mappings where capability_key = 'PLATOON_COMMANDER_EQUIVALENT'`
    );
    return;
  }

  await client.query(
    `
      insert into functional_role_mappings (capability_key, position_id, updated_by)
      values ($1, $2, $3)
      on conflict (capability_key) do update
      set
        position_id = excluded.position_id,
        updated_by = excluded.updated_by,
        updated_at = now()
    `,
    [snapshot.capabilityKey, snapshot.positionId, snapshot.updatedBy]
  );
}

async function loadRuntimeTargets(client: Client): Promise<RuntimeTargets> {
  const [rootRes, positionRes, ocRes] = await Promise.all([
    client.query(
      `
        select id
        from org_hierarchy_nodes
        where node_type = 'ROOT' and deleted_at is null
        limit 1
      `
    ),
    client.query(
      `
        select id, coalesce(display_name, key) as label
        from positions
        where key = 'arjunplcdr'
        limit 1
      `
    ),
    client.query(
      `
        select id
        from oc_cadets
        where platoon_id = $1
        order by created_at asc nulls last, id asc
        limit 1
      `,
      [ARJUN_PLATOON_ID]
    ),
  ]);

  const rootNodeId = rootRes.rows[0]?.id as string | undefined;
  const arjunPositionId = positionRes.rows[0]?.id as string | undefined;
  const arjunPositionLabel = positionRes.rows[0]?.label as string | undefined;
  const arjunOcId = ocRes.rows[0]?.id as string | undefined;

  if (!rootNodeId || !arjunPositionId || !arjunPositionLabel || !arjunOcId) {
    throw new Error("Missing live hierarchy/delegation test prerequisites in the local database.");
  }

  return {
    rootNodeId,
    arjunPositionId,
    arjunPositionLabel,
    arjunOcId,
  };
}

async function deleteNodeByKey(client: Client, key: string) {
  await client.query(`delete from org_hierarchy_nodes where key = $1`, [key]);
}

async function deleteDelegationById(client: Client, delegationId: string | null) {
  if (!delegationId) return;
  await client.query(`delete from delegations where id = $1`, [delegationId]);
}

async function selectRadixOptionByLabel(page: Page, label: string, optionPattern: RegExp | string) {
  const field = page.locator(`div.space-y-2:has(label:has-text("${label}"))`).first();
  await field.getByRole("combobox").click();
  await page.getByRole("option", typeof optionPattern === "string" ? { name: optionPattern } : { name: optionPattern }).click();
}

function isoDate(offsetDays = 0) {
  const now = new Date();
  const value = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
  return value.toISOString().slice(0, 10);
}

test("super admin can manage hierarchy, remap commander authority, delegate acting authority, and revoke it immediately", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const superContext = await createAuthedContext(browser, SUPER_ADMIN_SESSION);
  const delegatedContext = await browser.newContext({ baseURL: BASE_URL });

  const runtime = await withDb(loadRuntimeTargets);
  const originalMapping = await withDb(snapshotMapping);
  const runId = Date.now();
  const nodeKey = `LIVE_HIERARCHY_${runId}`;
  const nodeName = `Live Hierarchy ${runId}`;
  const updatedNodeName = `${nodeName} Updated`;
  const delegationReason = `Live delegated acting authority verification ${runId}`;
  let delegationId: string | null = null;

  try {
    const hierarchyPage = await superContext.newPage();
    await hierarchyPage.goto("/dashboard/genmgmt/hierarchy");
    await expect(hierarchyPage).toHaveURL(`${BASE_URL}/dashboard/genmgmt/hierarchy`);
    const csrfToken = await bootstrapCsrf(superContext);

    const createNodeResponse = await superContext.request.post("/api/v1/admin/hierarchy/nodes", {
      headers: {
        "X-CSRF-Token": csrfToken,
      },
      data: {
        key: nodeKey,
        name: nodeName,
        nodeType: "GROUP",
        parentId: runtime.rootNodeId,
        sortOrder: 17,
      },
    });
    expect(createNodeResponse.ok()).toBeTruthy();
    await hierarchyPage.reload();
    const nodeCard = hierarchyPage.locator("div.rounded-lg.border.p-4").filter({
      hasText: nodeKey,
    }).first();
    await expect(nodeCard).toBeVisible();
    await nodeCard.getByRole("button", { name: "Edit" }).click();
    await hierarchyPage.getByLabel(`Name`).last().fill(updatedNodeName);
    await hierarchyPage.getByRole("button", { name: "Save Changes" }).click();
    const updatedNodeCard = hierarchyPage.locator("div.rounded-lg.border.p-4").filter({
      hasText: nodeKey,
    }).first();
    await expect(updatedNodeCard).toBeVisible();

    await selectRadixOptionByLabel(
      hierarchyPage,
      "Commander-Equivalent Position",
      new RegExp(`${runtime.arjunPositionLabel} \\(PLATOON\\)`, "i")
    );
    await hierarchyPage.getByRole("button", { name: "Save Mapping" }).click();
    await expect(hierarchyPage.getByText(/Configured:\s*Arjun Pl CDR/i)).toBeVisible();

    const mappingResponse = await superContext.request.get(
      "/api/v1/admin/hierarchy/functional-role-mappings"
    );
    expect(mappingResponse.ok()).toBeTruthy();
    const mappingBody = (await mappingResponse.json()) as {
      configured?: { positionId?: string | null };
      effective?: { positionId?: string | null };
    };
    expect(mappingBody.configured?.positionId).toBe(runtime.arjunPositionId);
    expect(mappingBody.effective?.positionId).toBe(runtime.arjunPositionId);

    const appointmentPage = await superContext.newPage();
    await appointmentPage.goto("/dashboard/genmgmt/appointmentmgmt");
    await expect(appointmentPage).toHaveURL(`${BASE_URL}/dashboard/genmgmt/appointmentmgmt`);
    await appointmentPage.getByRole("button", { name: "Create Delegation" }).click();
    await appointmentPage.locator("#delegation-grantor").selectOption(ARJUN_APPOINTMENT_ID);
    await appointmentPage.locator("#delegation-grantee").selectOption(SUPERADMIN_USER_ID);
    await appointmentPage.locator("#delegation-starts-at").fill(isoDate(0));
    await appointmentPage.locator("#delegation-ends-at").fill(isoDate(2));
    await appointmentPage.locator("#delegation-reason").fill(delegationReason);
    await appointmentPage.getByRole("button", { name: "Create Delegation" }).last().click();

    const activeDelegationCard = appointmentPage
      .locator("div.rounded-lg.border.p-4")
      .filter({ hasText: "admin → superadmin" })
      .filter({ hasText: "Arjun Pl CDR" })
      .first();
    await expect(activeDelegationCard).toBeVisible({ timeout: 15000 });

    const adminDelegationsResponse = await superContext.request.get(
      "/api/v1/admin/delegations?activeOnly=true"
    );
    expect(adminDelegationsResponse.ok()).toBeTruthy();
    const adminDelegationsBody = (await adminDelegationsResponse.json()) as {
      items?: Array<{
        id: string;
        reason?: string | null;
        grantorAppointmentId?: string | null;
        granteeUserId?: string | null;
      }>;
    };
    delegationId =
      (adminDelegationsBody.items ?? []).find(
        (item) =>
          item.reason === delegationReason &&
          item.grantorAppointmentId === ARJUN_APPOINTMENT_ID &&
          item.granteeUserId === SUPERADMIN_USER_ID
      )?.id ?? null;
    expect(delegationId).toBeTruthy();

    const switchableResponse = await superContext.request.get("/api/v1/me/switchable-identities");
    expect(switchableResponse.ok()).toBeTruthy();
    const switchableBody = (await switchableResponse.json()) as {
      items?: Array<{
        kind: string;
        delegationId?: string | null;
        grantorLabel?: string | null;
        positionKey?: string | null;
      }>;
    };
    const delegationItem = (switchableBody.items ?? []).find(
      (item) =>
        item.kind === "DELEGATION" &&
        item.delegationId === delegationId &&
        item.grantorLabel === "admin" &&
        item.positionKey === "arjunplcdr"
    );
    expect(delegationItem, "Expected the new delegated authority to appear in switchable identities.").toBeTruthy();

    const loginResponse = await delegatedContext.request.post("/api/v1/auth/login", {
      data: {
        delegationId,
        username: process.env.SUPERADMIN_USERNAME,
        password: process.env.SUPERADMIN_PASSWORD,
        platoonId: ARJUN_PLATOON_ID,
      },
    });
    expect(loginResponse.ok()).toBeTruthy();

    const meResponse = await delegatedContext.request.get("/api/v1/me");
    expect(meResponse.ok()).toBeTruthy();
    const meBody = (await meResponse.json()) as {
      roles?: string[];
      apt?: { position?: string | null; scope?: { type?: string | null; id?: string | null } | null } | null;
      authority?: { kind?: string | null; delegationId?: string | null; grantorUsername?: string | null } | null;
    };
    expect(meBody.roles ?? []).toContain("PLATOON_COMMANDER_EQUIVALENT");
    expect(meBody.apt?.position).toBe("arjunplcdr");
    expect(meBody.apt?.scope?.type).toBe("PLATOON");
    expect(meBody.apt?.scope?.id).toBe(ARJUN_PLATOON_ID);
    expect(meBody.authority?.kind).toBe("DELEGATION");
    expect(meBody.authority?.delegationId).toBe(delegationId);
    expect(meBody.authority?.grantorUsername).toBe("admin");

    const dossierResponse = await delegatedContext.request.get(
      `/api/v1/oc/${runtime.arjunOcId}/dossier-snapshot?semister=1`
    );
    expect(dossierResponse.ok()).toBeTruthy();

    await activeDelegationCard.getByRole("button", { name: "Terminate" }).click();
    await expect(activeDelegationCard).toHaveCount(0, { timeout: 15000 });

    const revokedResponse = await delegatedContext.request.get("/api/v1/me");
    expect(revokedResponse.status()).toBe(401);
    await expect
      .soft((await revokedResponse.json()) as { error?: string })
      .toMatchObject({ error: "authority_inactive" });

    const appointmentListResponse = await superContext.request.get("/api/v1/admin/appointments");
    expect(appointmentListResponse.ok()).toBeTruthy();

    const refreshedHierarchy = await hierarchyPage.goto("/dashboard/genmgmt/hierarchy");
    expect(refreshedHierarchy?.ok()).toBeTruthy();
    const refreshedNodeCard = hierarchyPage
      .locator("div.rounded-lg.border.p-4")
      .filter({ hasText: updatedNodeName })
      .first();
    await refreshedNodeCard.getByRole("button", { name: "Delete" }).click();
    await expect(
      hierarchyPage.locator("div.rounded-lg.border.p-4").filter({ hasText: updatedNodeName })
    ).toHaveCount(0, {
      timeout: 15000,
    });
  } finally {
    await withDb(async (client) => {
      await deleteDelegationById(client, delegationId);
      await deleteNodeByKey(client, nodeKey);
      await restoreMapping(client, originalMapping);
    });

    await delegatedContext.close();
    await superContext.close();
  }
});
