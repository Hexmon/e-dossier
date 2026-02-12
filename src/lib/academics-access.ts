import { deriveSidebarRoleGroup } from "@/lib/sidebar-visibility";

type AcademicsAccessInput = {
  roles?: string[] | null;
  position?: string | null;
};

function normalizeRoleToken(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function collectRoleTokens(input: AcademicsAccessInput): Set<string> {
  const tokens = new Set((input.roles ?? []).map(normalizeRoleToken).filter(Boolean));
  const normalizedPosition = normalizeRoleToken(input.position);
  if (normalizedPosition) {
    tokens.add(normalizedPosition);
  }
  return tokens;
}

function isPlatoonCommanderToken(token: string): boolean {
  if (!token) return false;
  if (token === "PLATOON_COMMANDER" || token === "PLATOON_CDR") return true;

  // Support deployments that use custom position keys like "<name>plcdr".
  return token.endsWith("PLCDR");
}

export function canEditAcademics(input: AcademicsAccessInput): boolean {
  const roleGroup = deriveSidebarRoleGroup({
    roles: input.roles ?? [],
    position: input.position ?? null,
  });

  if (roleGroup === "ADMIN" || roleGroup === "SUPER_ADMIN") {
    return true;
  }

  const tokens = collectRoleTokens(input);
  if (tokens.has("COMMANDANT")) {
    return true;
  }

  for (const token of tokens) {
    if (isPlatoonCommanderToken(token)) {
      return true;
    }
  }

  return false;
}
