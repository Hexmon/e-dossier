type JwtPayloadRecord = Record<string, unknown>;

function decodeBase64Url(segment: string): string | null {
  try {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

    if (typeof Buffer !== "undefined") {
      return Buffer.from(padded, "base64").toString("utf8");
    }

    if (typeof atob === "function") {
      return atob(padded);
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Best-effort JWT payload decode without signature verification.
 * Intended only for non-security-critical metadata extraction.
 */
export function decodeJwtPayloadUnsafe(token: string | null | undefined): JwtPayloadRecord | null {
  if (!token) return null;

  const segments = token.split(".");
  if (segments.length < 2) return null;

  const payloadText = decodeBase64Url(segments[1]);
  if (!payloadText) return null;

  try {
    const payload = JSON.parse(payloadText);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload as JwtPayloadRecord;
  } catch {
    return null;
  }
}

