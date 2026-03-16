import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type StoreModuleMocks = {
  dispatchMock: ReturnType<typeof vi.fn>;
  appLogoutResetMock: ReturnType<typeof vi.fn>;
  persistorMock: {
    pause: ReturnType<typeof vi.fn>;
    flush: ReturnType<typeof vi.fn>;
    purge: ReturnType<typeof vi.fn>;
    persist: ReturnType<typeof vi.fn>;
  };
};

type AuthReturnModuleMocks = {
  buildLoginUrlWithNextMock: ReturnType<typeof vi.fn>;
  clearReturnUrlMock: ReturnType<typeof vi.fn>;
  getCurrentDashboardPathWithQueryMock: ReturnType<typeof vi.fn>;
  storeReturnUrlMock: ReturnType<typeof vi.fn>;
};

function setupWindow() {
  const replaceMock = vi.fn();
  const removeItemMock = vi.fn();

  (globalThis as any).window = {
    location: {
      pathname: '/dashboard/reports',
      search: '?tab=1',
      replace: replaceMock,
    },
    localStorage: {
      removeItem: removeItemMock,
    },
  };

  return { replaceMock, removeItemMock };
}

describe('logoutAndRedirect orchestrator', () => {
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as any).window = originalWindow;
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  async function loadWithMocks(params?: {
    requestServerLogoutImpl?: ReturnType<typeof vi.fn>;
    clearQueryImpl?: ReturnType<typeof vi.fn>;
    flushImpl?: ReturnType<typeof vi.fn>;
    purgeImpl?: ReturnType<typeof vi.fn>;
  }) {
    const requestServerLogoutMock = params?.requestServerLogoutImpl ?? vi.fn().mockResolvedValue(true);
    const clearQueryClientMock = params?.clearQueryImpl ?? vi.fn();

    const storeMocks: StoreModuleMocks = {
      dispatchMock: vi.fn(),
      appLogoutResetMock: vi.fn(() => ({ type: 'app/logoutReset' })),
      persistorMock: {
        pause: vi.fn(),
        flush: params?.flushImpl ?? vi.fn().mockResolvedValue(undefined),
        purge: params?.purgeImpl ?? vi.fn().mockResolvedValue(undefined),
        persist: vi.fn(),
      },
    };

    const authReturnMocks: AuthReturnModuleMocks = {
      buildLoginUrlWithNextMock: vi.fn((next: string) => `/login?next=${encodeURIComponent(next)}`),
      clearReturnUrlMock: vi.fn(),
      getCurrentDashboardPathWithQueryMock: vi.fn(() => '/dashboard/reports?tab=1'),
      storeReturnUrlMock: vi.fn(),
    };

    vi.doMock('@/lib/auth/logout-request', () => ({
      requestServerLogout: requestServerLogoutMock,
    }));

    vi.doMock('@/lib/query-client-registry', () => ({
      clearGlobalQueryClient: clearQueryClientMock,
    }));

    vi.doMock('@/store', () => ({
      store: { dispatch: storeMocks.dispatchMock },
      appLogoutReset: storeMocks.appLogoutResetMock,
      persistor: storeMocks.persistorMock,
    }));

    vi.doMock('@/lib/auth-return-url', () => ({
      buildLoginUrlWithNext: authReturnMocks.buildLoginUrlWithNextMock,
      clearReturnUrl: authReturnMocks.clearReturnUrlMock,
      getCurrentDashboardPathWithQuery: authReturnMocks.getCurrentDashboardPathWithQueryMock,
      storeReturnUrl: authReturnMocks.storeReturnUrlMock,
    }));

    const mod = await import('@/lib/auth/logout');

    return {
      logoutAndRedirect: mod.logoutAndRedirect,
      requestServerLogoutMock,
      clearQueryClientMock,
      storeMocks,
      authReturnMocks,
    };
  }

  it('waits for server logout completion before redirect', async () => {
    const { replaceMock } = setupWindow();

    let resolveRequest: ((value: boolean) => void) | null = null;
    const requestServerLogoutMock = vi.fn().mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRequest = resolve;
        })
    );

    const { logoutAndRedirect } = await loadWithMocks({ requestServerLogoutImpl: requestServerLogoutMock });
    const router = { replace: vi.fn() };

    const promise = logoutAndRedirect({ router, reason: 'manual' });
    await Promise.resolve();

    expect(router.replace).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();

    resolveRequest?.(true);
    await promise;

    expect(router.replace).toHaveBeenCalledWith('/login');
    expect(requestServerLogoutMock).toHaveBeenCalledTimes(1);
  });

  it('redirects without awaiting deferred heavy cleanup', async () => {
    setupWindow();

    const flushPending = vi.fn().mockReturnValue(new Promise(() => {}));
    const purgePending = vi.fn().mockReturnValue(new Promise(() => {}));

    const { logoutAndRedirect, clearQueryClientMock, storeMocks } = await loadWithMocks({
      flushImpl: flushPending,
      purgeImpl: purgePending,
    });

    const router = { replace: vi.fn() };
    await logoutAndRedirect({ router, reason: 'manual' });

    expect(router.replace).toHaveBeenCalledWith('/login');
    expect(clearQueryClientMock).toHaveBeenCalledTimes(1);
    expect(storeMocks.persistorMock.flush).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(3100);

    expect(clearQueryClientMock).toHaveBeenCalledTimes(2);
    expect(storeMocks.persistorMock.flush).toHaveBeenCalledTimes(1);
    expect(storeMocks.persistorMock.purge).toHaveBeenCalledTimes(1);
  });

  it('still resets local auth state and redirects when server logout fails', async () => {
    setupWindow();

    const requestServerLogoutMock = vi.fn().mockResolvedValue(false);
    const { logoutAndRedirect, storeMocks } = await loadWithMocks({
      requestServerLogoutImpl: requestServerLogoutMock,
    });

    const router = { replace: vi.fn() };
    await logoutAndRedirect({ router, reason: 'manual', showServerErrorToast: false });

    expect(requestServerLogoutMock).toHaveBeenCalledTimes(1);
    expect(storeMocks.appLogoutResetMock).toHaveBeenCalledTimes(1);
    expect(storeMocks.dispatchMock).toHaveBeenCalledWith({ type: 'app/logoutReset' });
    expect(router.replace).toHaveBeenCalledWith('/login');
  });

  it('keeps one-flight behavior for duplicate calls', async () => {
    setupWindow();

    let resolveRequest: ((value: boolean) => void) | null = null;
    const requestServerLogoutMock = vi.fn().mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRequest = resolve;
        })
    );

    const { logoutAndRedirect } = await loadWithMocks({ requestServerLogoutImpl: requestServerLogoutMock });
    const router = { replace: vi.fn() };

    const p1 = logoutAndRedirect({ router, reason: 'unauthorized', preserveNext: true, showServerErrorToast: false });
    const p2 = logoutAndRedirect({ router, reason: 'unauthorized', preserveNext: true, showServerErrorToast: false });

    expect(requestServerLogoutMock).toHaveBeenCalledTimes(1);

    resolveRequest?.(true);
    await Promise.all([p1, p2]);

    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('handles deferred cleanup failures without unhandled rejections', async () => {
    setupWindow();

    const clearQueryClientMock = vi.fn(() => {
      throw new Error('clear failed');
    });
    const flushReject = vi.fn().mockRejectedValue(new Error('flush failed'));
    const purgeReject = vi.fn().mockRejectedValue(new Error('purge failed'));

    const { logoutAndRedirect } = await loadWithMocks({
      clearQueryImpl: clearQueryClientMock,
      flushImpl: flushReject,
      purgeImpl: purgeReject,
    });

    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => {
      unhandled.push(reason);
    };

    process.on('unhandledRejection', listener);

    try {
      await logoutAndRedirect({
        router: { replace: vi.fn() },
        reason: 'manual',
        showServerErrorToast: false,
      });

      await vi.runOnlyPendingTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      expect(unhandled).toHaveLength(0);
    } finally {
      process.off('unhandledRejection', listener);
    }
  });
});
