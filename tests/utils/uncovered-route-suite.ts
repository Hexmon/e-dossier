import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_REQUEST_BODY, importRouteModule, makeRouteRequest } from './api-route-flow';
import { forceAuthFailure, resetCommonMocks } from './uncovered-route-mocks';
import { readExportedMethods, type HttpMethod } from '../../scripts/lib/api-route-inventory';

type RouteMethodOverrides = Partial<Record<HttpMethod, string>>;
type RouteBodyOverrides = Partial<Record<HttpMethod, Record<string, unknown>>>;
type RouteStatusOverrides = Partial<Record<HttpMethod, number>>;
type RouteSetupOverrides = Partial<Record<HttpMethod, () => void | Promise<void>>>;
type RouteSkipOverrides = Partial<Record<HttpMethod, boolean>>;
type RouteRequestFactory = Partial<
  Record<HttpMethod, () => { req: any; params: Record<string, string> }>
>;
type RouteModuleMap = Record<string, Record<string, any>>;

export type RouteFlowOverrides = Record<
  string,
  {
    query?: RouteMethodOverrides;
    body?: RouteBodyOverrides;
    expectedStatus?: RouteStatusOverrides;
    successSetup?: RouteSetupOverrides;
    skipAuthFailure?: boolean | RouteSkipOverrides;
    requestFactory?: RouteRequestFactory;
  }
>;

function isAuthFailureSkipped(routeFile: string, method: HttpMethod, overrides: RouteFlowOverrides) {
  const override = overrides[routeFile]?.skipAuthFailure;
  if (typeof override === 'boolean') return override;
  return override?.[method] ?? false;
}

function createInvocation(routeFile: string, method: HttpMethod, routeOverride?: RouteFlowOverrides[string]) {
  const customFactory = routeOverride?.requestFactory?.[method];
  if (customFactory) {
    return customFactory();
  }

  return makeRouteRequest(
    routeFile,
    method,
    routeOverride?.query?.[method] ?? '',
    routeOverride?.body?.[method] ?? DEFAULT_REQUEST_BODY,
  );
}

async function withStepTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 2_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getPreloadedRouteModule(routeFile: string, routeModules?: RouteModuleMap) {
  if (!routeModules) return null;

  const moduleKey = `../../${routeFile}`;
  const routeModule = routeModules[moduleKey];
  if (!routeModule) {
    throw new Error(`No preloaded route module registered for ${routeFile}`);
  }

  return routeModule;
}

export function runUncoveredRouteFlowSuite(
  suiteName: string,
  routeFiles: readonly string[],
  overrides: RouteFlowOverrides = {},
  routeModules?: RouteModuleMap,
) {
  describe(suiteName, () => {
    if (!routeModules) {
      beforeAll(async () => {
        for (const routeFile of routeFiles) {
          await withStepTimeout(importRouteModule(routeFile), `${routeFile} preload`, 5_000);
        }
      }, 120_000);
    }

    beforeEach(() => {
      resetCommonMocks();
    });

    for (const routeFile of routeFiles) {
      const relativeLabel = routeFile.replace(/^src\/app\/api\//, '');
      const methods = readExportedMethods(routeFile);

      describe(relativeLabel, () => {
        for (const method of methods) {
          const routeOverride = overrides[routeFile];

          if (!isAuthFailureSkipped(routeFile, method, overrides)) {
            it(`${method} rejects when auth or access context fails`, async () => {
              forceAuthFailure();

              const { req, params } = createInvocation(routeFile, method, routeOverride);
              const routeModule =
                getPreloadedRouteModule(routeFile, routeModules) ??
                (await withStepTimeout(
                  importRouteModule(routeFile),
                  `${routeFile} ${method} import`,
                ));
              const res = await withStepTimeout(
                routeModule[method](req as any, { params: Promise.resolve(params) }),
                `${routeFile} ${method} handler`,
              );

              expect([401, 403]).toContain(res.status);
            });
          }

          it(`${method} handles a representative request`, async () => {
            await routeOverride?.successSetup?.[method]?.();

            const { req, params } = createInvocation(routeFile, method, routeOverride);

            const routeModule =
              getPreloadedRouteModule(routeFile, routeModules) ??
              (await withStepTimeout(
                importRouteModule(routeFile),
                `${routeFile} ${method} import`,
              ));
            const res = await withStepTimeout(
              routeModule[method](req as any, { params: Promise.resolve(params) }),
              `${routeFile} ${method} handler`,
            );
            const expectedStatus = routeOverride?.expectedStatus?.[method];

            if (expectedStatus) {
              expect(res.status).toBe(expectedStatus);
            } else {
              expect(res.status).toBeGreaterThanOrEqual(200);
              expect(res.status).toBeLessThan(500);
            }
          });
        }
      });
    }
  });
}
