import { COMMANDER_EQUIVALENT_CAPABILITY } from "@/lib/functional-role-capabilities";

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
  return token === COMMANDER_EQUIVALENT_CAPABILITY || token === "PLATOON_COMMANDER";
}

export function hasPlatoonCommanderRole(input: PlatoonCommanderAccessInput): boolean {
  return collectTokens(input).some((token) => isPlatoonCommanderToken(token));
}

export function isScopedPlatoonCommander(input: PlatoonCommanderAccessInput): boolean {
  const scopeType = normalizeAccessToken(input.scopeType);
  if (scopeType !== "PLATOON") return false;
  return hasPlatoonCommanderRole(input);
}
