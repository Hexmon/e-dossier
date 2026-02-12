function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false;
  return fallback;
}

export function isAuthzV2Enabled(): boolean {
  const fromPublic = process.env.NEXT_PUBLIC_AUTHZ_V2_ENABLED;
  const fromServer = process.env.AUTHZ_V2_ENABLED;
  return parseBoolean(fromPublic ?? fromServer, false);
}
