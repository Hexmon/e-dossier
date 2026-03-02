type RequestServerLogoutOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  requestTimeoutMs?: number;
};

export async function requestServerLogout(
  options: RequestServerLogoutOptions = {}
): Promise<boolean> {
  const maxRetries = Math.max(1, options.maxRetries ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 400;
  const requestTimeoutMs = options.requestTimeoutMs ?? 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      const res = await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        return true;
      }

      // Do not retry non-retriable client errors.
      if (res.status >= 400 && res.status < 500) {
        return false;
      }
    } catch {
      // Best effort retry for network/abort/server-side transient failures.
    } finally {
      clearTimeout(timeoutId);
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }

  return false;
}
