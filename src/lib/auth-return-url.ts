export const RETURN_URL_SESSION_KEY = "ed_return_url";

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function isSafeReturnUrl(path: string): boolean {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return false;
  }

  return (
    path === "/dashboard" ||
    path.startsWith("/dashboard/") ||
    path.startsWith("/dashboard?")
  );
}

export function sanitizeReturnUrl(input: string | null | undefined): string | null {
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed || trimmed.startsWith("//")) {
    return null;
  }

  try {
    const normalized = new URL(trimmed, "http://localhost");
    const candidate = `${normalized.pathname}${normalized.search}`;
    return isSafeReturnUrl(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function getCurrentDashboardPathWithQuery(): string | null {
  if (typeof window === "undefined") return null;
  return sanitizeReturnUrl(`${window.location.pathname}${window.location.search}`);
}

export function storeReturnUrl(url: string): void {
  const safe = sanitizeReturnUrl(url);
  if (!safe) return;

  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.setItem(RETURN_URL_SESSION_KEY, safe);
  } catch {
    // Ignore storage write failures.
  }
}

export function readReturnUrl(): string | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    return sanitizeReturnUrl(storage.getItem(RETURN_URL_SESSION_KEY));
  } catch {
    return null;
  }
}

export function clearReturnUrl(): void {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.removeItem(RETURN_URL_SESSION_KEY);
  } catch {
    // Ignore storage clear failures.
  }
}

export function resolvePostAuthRedirect(opts: {
  nextParam?: string | null;
  storedReturnUrl?: string | null;
  fallback?: string;
}): string {
  const fromNext = sanitizeReturnUrl(opts.nextParam);
  if (fromNext) return fromNext;

  const fromStorage = sanitizeReturnUrl(opts.storedReturnUrl ?? readReturnUrl());
  if (fromStorage) return fromStorage;

  return sanitizeReturnUrl(opts.fallback ?? "/dashboard") ?? "/dashboard";
}

export function buildLoginUrlWithNext(returnUrl: string | null): string {
  const safe = sanitizeReturnUrl(returnUrl);
  if (!safe) return "/login";
  return `/login?next=${encodeURIComponent(safe)}`;
}
