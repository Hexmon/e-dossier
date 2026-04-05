import 'dotenv/config';
import { test, expect, type Browser, type BrowserContext } from '@playwright/test';
import { SignJWT, importPKCS8 } from 'jose';
import { acquireLiveSuiteLock } from './live-suite-lock';

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:3000';

const JWT_ISSUER = 'e-dossier';
const JWT_AUDIENCE = 'e-dossier-api';
const ARJUN_SCOPE_ID = '0d95a05c-6064-4fb5-9566-df8e60dfee81';

const SUPER_ADMIN_SESSION = {
  userId: 'a5b41269-a5a0-4ff8-8de0-a76d45299be8',
  roles: ['SUPER_ADMIN'],
  apt: {
    id: '8387f26c-9969-4268-bd75-758b7572d20e',
    position: 'SUPER_ADMIN',
    scope: { type: 'GLOBAL', id: null as string | null },
    valid_from: '2026-04-03T19:45:26.044Z',
    valid_to: null as string | null,
  },
};

const ARJUN_SESSION = {
  userId: '8bf30fde-3cec-4b28-b2a8-1377da9d428a',
  roles: ['arjunplcdr', 'PLATOON_COMMANDER_EQUIVALENT'],
  apt: {
    id: 'c3e284e7-84f0-473f-9062-f4d67a393c14',
    position: 'arjunplcdr',
    scope: { type: 'PLATOON', id: ARJUN_SCOPE_ID },
    valid_from: '2026-03-04T00:00:00.000Z',
    valid_to: null as string | null,
  },
};

type Session = typeof SUPER_ADMIN_SESSION | typeof ARJUN_SESSION;

type OcListItem = {
  id: string;
  platoonId: string | null;
  platoonKey: string | null;
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
  return (value ?? '').replace(/\\n/g, '\n').replace(/^"+|"+$/g, '').trim();
}

async function signAccessToken(session: Session) {
  const privateKeyPem = normalizePem(process.env.ACCESS_TOKEN_PRIVATE_KEY);
  if (!privateKeyPem) {
    throw new Error('ACCESS_TOKEN_PRIVATE_KEY is required for the live access-control test.');
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

async function createAuthedContext(browser: Browser, session: Session) {
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

async function loadOcTargets(context: BrowserContext) {
  const response = await context.request.get('/api/v1/oc');
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { items?: OcListItem[] };
  const items = payload.items ?? [];

  const inScope = items.find((item) => item.platoonId === ARJUN_SCOPE_ID);
  expect(inScope, 'Expected at least one ARJUN OC for the platoon-scoped regression test.').toBeTruthy();

  return {
    items,
    inScopeId: inScope!.id,
  };
}

test('platoon-scoped browser session is blocked from admin surfaces and foreign OCs', async ({ browser }) => {
  const superContext = await createAuthedContext(browser, SUPER_ADMIN_SESSION);
  const arjunContext = await createAuthedContext(browser, ARJUN_SESSION);

  try {
    const { items: allOcs } = await loadOcTargets(superContext);
    const { inScopeId } = await loadOcTargets(arjunContext);

    const foreignOc = allOcs.find((item) => item.platoonId && item.platoonId !== ARJUN_SCOPE_ID);
    expect(foreignOc, 'Expected at least one foreign-platoon OC for the regression test.').toBeTruthy();

    const page = await arjunContext.newPage();

    const deniedAdminResponse = await page.goto('/dashboard/genmgmt');
    expect(deniedAdminResponse?.ok()).toBeTruthy();
    await expect(page).toHaveURL(new RegExp(`${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/dashboard/?$`));

    const reportsResponse = await page.goto('/dashboard/reports');
    expect(reportsResponse?.ok()).toBeTruthy();
    await expect(page).toHaveURL(`${BASE_URL}/dashboard/reports`);

    const adminUsersResponse = await arjunContext.request.get('/api/v1/admin/users');
    expect(adminUsersResponse.status()).toBe(403);
    await expect
      .soft((await adminUsersResponse.json()) as { message?: string })
      .toMatchObject({ message: 'Admin privileges required' });

    const foreignDetailResponse = await arjunContext.request.get(`/api/v1/oc/${foreignOc!.id}`);
    expect(foreignDetailResponse.status()).toBe(403);

    const foreignDossierResponse = await arjunContext.request.get(`/api/v1/oc/${foreignOc!.id}/dossier-snapshot`);
    expect(foreignDossierResponse.status()).toBe(403);

    const inScopeDetailResponse = await arjunContext.request.get(`/api/v1/oc/${inScopeId}`);
    expect(inScopeDetailResponse.ok()).toBeTruthy();
  } finally {
    await arjunContext.close();
    await superContext.close();
  }
});

test('super admin browser session can still reach hardened admin surfaces', async ({ browser }) => {
  const context = await createAuthedContext(browser, SUPER_ADMIN_SESSION);

  try {
    const page = await context.newPage();
    const response = await page.goto('/dashboard/genmgmt');
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveURL(`${BASE_URL}/dashboard/genmgmt`);

    const adminUsersResponse = await context.request.get('/api/v1/admin/users');
    expect(adminUsersResponse.ok()).toBeTruthy();
  } finally {
    await context.close();
  }
});
