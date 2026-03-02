import type { NextRequest } from "next/server";
import { ApiError } from "@/app/lib/http";
import { hasAdminRole, requireAuth } from "@/app/lib/authz";

type ClaimsWithApt = {
  apt?: {
    position?: string | null;
    scope?: {
      type?: string | null;
      id?: string | null;
    };
  };
};

function normalizeRole(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export type RelegationAccessContext = {
  userId: string;
  roles: string[];
  isAdmin: boolean;
  isPlatoonCommander: boolean;
  canWriteSingle: boolean;
  canPromoteBatch: boolean;
  scopeType: string | null;
  scopeId: string | null;
  scopePlatoonId: string | null;
};

export async function getRelegationAccessContext(req: NextRequest): Promise<RelegationAccessContext> {
  const auth = await requireAuth(req);
  const claims = (auth.claims ?? {}) as ClaimsWithApt;

  const position = normalizeRole(claims.apt?.position);
  const roleSet = new Set((auth.roles ?? []).map(normalizeRole));
  if (position) roleSet.add(position);

  const isAdmin = hasAdminRole(Array.from(roleSet));

  const scopeTypeRaw = String(claims.apt?.scope?.type ?? "").trim();
  const scopeType = scopeTypeRaw ? scopeTypeRaw.toUpperCase() : null;
  const scopeId = claims.apt?.scope?.id ? String(claims.apt?.scope?.id) : null;
  const scopePlatoonId = scopeType === "PLATOON" && scopeId ? scopeId : null;

  const isPlatoonCommander = Boolean(scopePlatoonId);

  return {
    userId: auth.userId,
    roles: Array.from(roleSet),
    isAdmin,
    isPlatoonCommander,
    canWriteSingle: isAdmin || isPlatoonCommander,
    canPromoteBatch: isAdmin,
    scopeType,
    scopeId,
    scopePlatoonId,
  };
}

export function assertCanWriteSingle(access: RelegationAccessContext) {
  if (!access.canWriteSingle) {
    throw new ApiError(403, "Forbidden: write access requires admin or platoon commander role.", "forbidden");
  }
}

export function assertCanPromoteBatch(access: RelegationAccessContext) {
  if (!access.canPromoteBatch) {
    throw new ApiError(403, "Forbidden: bulk promotion is restricted to admin users.", "forbidden");
  }
}
