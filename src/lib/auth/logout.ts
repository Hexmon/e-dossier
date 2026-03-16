import { appLogoutReset, persistor, store } from "@/store";
import { clearGlobalQueryClient } from "@/lib/query-client-registry";
import {
  buildLoginUrlWithNext,
  clearReturnUrl,
  getCurrentDashboardPathWithQuery,
  storeReturnUrl,
} from "@/lib/auth-return-url";
import { requestServerLogout } from "@/lib/auth/logout-request";

type LogoutReason = "manual" | "unauthorized" | "switch_user" | "unknown";

type RouterLike = {
  replace: (href: string, options?: { scroll?: boolean }) => void;
};

type LogoutAndRedirectParams = {
  reason?: LogoutReason;
  preserveNext?: boolean;
  router?: RouterLike;
  showServerErrorToast?: boolean;
};

type LogoutMetrics = {
  startedAt: number;
  serverLogoutMs: number;
  preRedirectMs: number;
  redirectIssuedAt: number;
};

const LOGOUT_CLIENT_DEBUG = process.env.NEXT_PUBLIC_LOGOUT_DEBUG === "true";
const LOGOUT_SERVER_TIMEOUT_MS = 2000;

let logoutInFlightPromise: Promise<void> | null = null;
let logoutRedirectIssued = false;

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function debugLog(payload: Record<string, unknown>) {
  if (!LOGOUT_CLIENT_DEBUG) return;
  try {
    console.info(JSON.stringify({ type: "logout.client", ...payload }));
  } catch {
    // Non-blocking debug log only.
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

function getLoginRedirectUrl(preserveNext: boolean) {
  const returnUrl = preserveNext ? getCurrentDashboardPathWithQuery() : null;
  if (returnUrl) {
    storeReturnUrl(returnUrl);
    return buildLoginUrlWithNext(returnUrl);
  }
  clearReturnUrl();
  return "/login";
}

function scheduleDeferred(task: () => void) {
  if (typeof window === "undefined") return;

  const win = window as Window & {
    requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
  };

  if (typeof win.requestIdleCallback === "function") {
    win.requestIdleCallback(() => task(), { timeout: 1000 });
    return;
  }

  setTimeout(task, 0);
}

function deferHeavyCleanup(params: {
  logoutSucceeded: boolean;
  showServerErrorToast: boolean;
  metrics: LogoutMetrics;
}) {
  const { logoutSucceeded, showServerErrorToast, metrics } = params;

  scheduleDeferred(() => {
    const cleanupStart = nowMs();

    try {
      const queryStart = nowMs();
      clearGlobalQueryClient();
      debugLog({
        event: "query-clear-complete",
        queryClearMs: Number((nowMs() - queryStart).toFixed(2)),
      });
    } catch (error) {
      debugLog({
        event: "query-clear-failed",
        error: error instanceof Error ? error.message : "unknown",
      });
    }

    void (async () => {
      try {
        persistor.pause();
      } catch (error) {
        debugLog({
          event: "persistor-pause-failed",
          error: error instanceof Error ? error.message : "unknown",
        });
      }

      const flushStart = nowMs();
      try {
        await withTimeout(persistor.flush(), 1500);
      } catch (error) {
        debugLog({
          event: "persistor-flush-failed",
          error: error instanceof Error ? error.message : "unknown",
        });
      }

      const purgeStart = nowMs();
      try {
        await withTimeout(persistor.purge(), 1500);
      } catch (error) {
        debugLog({
          event: "persistor-purge-failed",
          error: error instanceof Error ? error.message : "unknown",
        });
      }

      try {
        persistor.persist();
      } catch (error) {
        debugLog({
          event: "persistor-resume-failed",
          error: error instanceof Error ? error.message : "unknown",
        });
      }

      debugLog({
        event: "deferred-cleanup-complete",
        flushMs: Number((purgeStart - flushStart).toFixed(2)),
        purgeMs: Number((nowMs() - purgeStart).toFixed(2)),
        cleanupTotalMs: Number((nowMs() - cleanupStart).toFixed(2)),
        serverLogoutMs: Number(metrics.serverLogoutMs.toFixed(2)),
        preRedirectMs: Number(metrics.preRedirectMs.toFixed(2)),
        redirectIssuedAtMs: Number((metrics.redirectIssuedAt - metrics.startedAt).toFixed(2)),
      });
    })().catch((error) => {
      debugLog({
        event: "deferred-cleanup-unhandled",
        error: error instanceof Error ? error.message : "unknown",
      });
    });

    if (!logoutSucceeded && showServerErrorToast) {
      void (async () => {
        try {
          const { toast } = await import("sonner");
          toast.error("Logout request failed on server. Local session was cleared.");
        } catch {
          // Non-blocking toast failure.
        }
      })();
    }
  });
}

function redirectToLogin(url: string, router?: RouterLike) {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login" && !url.includes("?next=")) {
    return;
  }

  if (router) {
    try {
      window.history.replaceState({}, "", url);
    } catch {
      // Browser API failures should not block logout.
    }

    router.replace(url);
    return;
  }

  const locationLike = window.location as Location & {
    assign?: (href: string) => void;
    replace?: (href: string) => void;
  };

  if (typeof locationLike.replace === "function") {
    locationLike.replace(url);
    return;
  }

  if (typeof locationLike.assign === "function") {
    locationLike.assign(url);
    return;
  }

  locationLike.href = url;
}

export async function logoutAndRedirect(params: LogoutAndRedirectParams = {}): Promise<void> {
  if (typeof window === "undefined") return;
  if (logoutInFlightPromise) return logoutInFlightPromise;

  logoutInFlightPromise = (async () => {
    const startedAt = nowMs();
    const preserveNext = params.preserveNext ?? params.reason === "unauthorized";
    const showServerErrorToast = params.showServerErrorToast ?? true;
    const redirectUrl = getLoginRedirectUrl(preserveNext);

    const serverStart = nowMs();
    const logoutSucceeded = await requestServerLogout({
      requestTimeoutMs: LOGOUT_SERVER_TIMEOUT_MS,
      maxRetries: 1,
    });
    const serverLogoutMs = nowMs() - serverStart;

    if (typeof window !== "undefined") {
      try {
        window.localStorage?.removeItem("authToken");
      } catch {
        // Non-blocking local storage cleanup.
      }

      try {
        clearGlobalQueryClient();
      } catch {
        // Non-blocking client state cleanup.
      }
    }
    store.dispatch(appLogoutReset());

    const preRedirectMs = nowMs() - startedAt;
    if (!logoutRedirectIssued) {
      logoutRedirectIssued = true;
      redirectToLogin(redirectUrl, params.router);
    }

    const metrics: LogoutMetrics = {
      startedAt,
      serverLogoutMs,
      preRedirectMs,
      redirectIssuedAt: nowMs(),
    };

    debugLog({
      event: "redirect-issued",
      logoutSucceeded,
      serverLogoutMs: Number(serverLogoutMs.toFixed(2)),
      preRedirectMs: Number(preRedirectMs.toFixed(2)),
      reason: params.reason ?? "unknown",
      preserveNext,
    });

    deferHeavyCleanup({
      logoutSucceeded,
      showServerErrorToast,
      metrics,
    });
  })().finally(() => {
    logoutInFlightPromise = null;
    // Prevent duplicate redirect calls in a narrow window before navigation settles.
    setTimeout(() => {
      logoutRedirectIssued = false;
    }, 250);
  });

  return logoutInFlightPromise;
}
