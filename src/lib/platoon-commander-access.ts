type PlatoonCommanderAccessInput = {
  roles?: Array<string | null | undefined> | null;
  position?: string | null;
  scopeType?: string | null;
};

export function normalizeAccessToken(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function collectTokens(input: PlatoonCommanderAccessInput): string[] {
  const out = (input.roles ?? [])
    .map((value) => normalizeAccessToken(value))
    .filter(Boolean);
  const positionToken = normalizeAccessToken(input.position);
  if (positionToken) {
    out.push(positionToken);
  }
  return out;
}

export function isPlatoonCommanderToken(token: string): boolean {
  if (!token) return false;
  if (token === "PLATOON_COMMANDER" || token === "PLATOON_CDR") return true;
  if (token === "PL_CDR" || token === "PLCDR") return true;

  const compact = token.replace(/[^A-Z0-9]/g, "");
  if (compact.includes("PLATOONCOMMANDER")) return true;
  return compact.endsWith("PLCDR");
}

export function hasPlatoonCommanderRole(input: PlatoonCommanderAccessInput): boolean {
  return collectTokens(input).some((token) => isPlatoonCommanderToken(token));
}

export function isScopedPlatoonCommander(input: PlatoonCommanderAccessInput): boolean {
  const scopeType = normalizeAccessToken(input.scopeType);
  if (scopeType !== "PLATOON") return false;
  return hasPlatoonCommanderRole(input);
}
