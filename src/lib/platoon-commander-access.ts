type PlatoonCommanderAccessInput = {
  roles?: string[] | null;
  position?: string | null;
  scopeType?: string | null;
};

function normalizeRoleToken(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function collectRoleTokens(input: PlatoonCommanderAccessInput): Set<string> {
  const tokens = new Set((input.roles ?? []).map(normalizeRoleToken).filter(Boolean));
  const normalizedPosition = normalizeRoleToken(input.position);
  if (normalizedPosition) {
    tokens.add(normalizedPosition);
  }
  return tokens;
}

export function isPlatoonCommanderToken(token: string | null | undefined): boolean {
  const normalized = normalizeRoleToken(token);
  if (!normalized) return false;
  if (normalized === "PLATOON_COMMANDER" || normalized === "PLATOON_CDR") return true;
  return normalized.endsWith("PLCDR");
}

export function canManageCadetAppointments(
  input: PlatoonCommanderAccessInput
): boolean {
  const normalizedScopeType = normalizeRoleToken(input.scopeType);
  if (normalizedScopeType !== "PLATOON") {
    return false;
  }

  for (const token of collectRoleTokens(input)) {
    if (isPlatoonCommanderToken(token)) {
      return true;
    }
  }

  return false;
}
