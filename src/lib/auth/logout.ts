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

let logoutInFlightPromise: Promise<void> | null = null;

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

async function resetLocalAuthState() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("authToken");
  }

  store.dispatch(appLogoutReset());
  clearGlobalQueryClient();

  persistor.pause();
  try {
    await withTimeout(persistor.flush(), 1500);
  } catch {
    // Ignore flush failures and continue purging.
  }

  try {
    await withTimeout(persistor.purge(), 1500);
  } catch {
    // Ignore purge failures and continue redirect.
  }

  persistor.persist();
}

function redirectToLogin(url: string, router?: RouterLike) {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login" && !url.includes("?next=")) {
    return;
  }

  if (router) {
    router.replace(url);
    return;
  }

  window.location.replace(url);
}

export async function logoutAndRedirect(params: LogoutAndRedirectParams = {}): Promise<void> {
  if (typeof window === "undefined") return;
  if (logoutInFlightPromise) return logoutInFlightPromise;

  logoutInFlightPromise = (async () => {
    const preserveNext = params.preserveNext ?? params.reason === "unauthorized";
    const showServerErrorToast = params.showServerErrorToast ?? true;
    const redirectUrl = getLoginRedirectUrl(preserveNext);

    const logoutSucceeded = await requestServerLogout();
    await resetLocalAuthState();

    if (!logoutSucceeded && showServerErrorToast) {
      try {
        const { toast } = await import("sonner");
        toast.error("Logout request failed on server. Local session was cleared.");
      } catch {
        // Non-blocking toast failure.
      }
    }

    redirectToLogin(redirectUrl, params.router);
  })().finally(() => {
    logoutInFlightPromise = null;
  });

  return logoutInFlightPromise;
}
