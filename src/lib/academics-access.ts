import { deriveSidebarRoleGroup } from "@/lib/sidebar-visibility";
import { hasPlatoonCommanderRole } from "@/lib/platoon-commander-access";

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

  if (
    hasPlatoonCommanderRole({
      roles: input.roles ?? [],
      position: input.position ?? null,
    })
  ) {
    return true;
  }

  return false;
}
