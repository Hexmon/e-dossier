type RequestServerLogoutOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
};

export async function requestServerLogout(
  options: RequestServerLogoutOptions = {}
): Promise<boolean> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 400;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const res = await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        return true;
      }
    } catch {
      // Best effort retry.
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }

  return false;
}
