import type { NextRequest } from 'next/server';
import type { Principal } from '@hexmon_tech/acccess-control-core';
import { requireAuth } from '@/app/lib/authz';
import { getEffectivePermissionBundleCached } from '@/app/db/queries/authz-permissions';

type PrincipalOptions = {
  tenantId?: string;
  permissions?: string[];
  deniedPermissions?: string[];
};

type AptClaim = {
  id?: string;
  position?: string;
  scope?: { type?: string; id?: string | null };
};

function asStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((value): value is string => typeof value === 'string');
}

function normalizeRole(value: string): string {
  return value.trim().toUpperCase();
}

function buildTenantId(claims: Record<string, unknown>, override?: string): string {
  if (override) return override;

  const apt = claims.apt as
    | {
        scope?: { type?: string; id?: string | null };
      }
    | undefined;

  const scopeId = apt?.scope?.id;
  if (typeof scopeId === 'string' && scopeId.trim().length > 0) return scopeId;

  const scopeType = apt?.scope?.type;
  if (typeof scopeType === 'string' && scopeType.trim().length > 0) {
    return `scope:${scopeType.toUpperCase()}`;
  }

  return 'GLOBAL';
}

export async function buildPrincipalFromRequest(req: NextRequest, options?: PrincipalOptions): Promise<Principal> {
  const auth = await requireAuth(req);
  const claims = (auth.claims ?? {}) as Record<string, unknown>;
  const apt = claims.apt as AptClaim | undefined;

  const roles = new Set<string>();
  for (const role of auth.roles ?? []) {
    roles.add(normalizeRole(role));
  }

  const position = typeof apt?.position === 'string' ? normalizeRole(apt.position) : undefined;
  if (position) roles.add(position);
  if (roles.has('SUPER_ADMIN')) roles.add('ADMIN');
  if (position === 'SUPER_ADMIN') {
    roles.add('SUPER_ADMIN');
    roles.add('ADMIN');
  }
  if (position === 'ADMIN') roles.add('ADMIN');

  const permissionsFromClaims = asStringArray((claims as { permissions?: unknown }).permissions);
  const deniedFromClaims = asStringArray((claims as { deniedPermissions?: unknown }).deniedPermissions);
  const aptClaim = claims.apt as AptClaim | undefined;

  const effective = await getEffectivePermissionBundleCached({
    userId: auth.userId,
    roles: Array.from(roles),
    apt: aptClaim,
  });

  const permissions = options?.permissions ?? (effective.permissions.length ? effective.permissions : permissionsFromClaims);
  const deniedPermissions =
    options?.deniedPermissions ?? (effective.deniedPermissions.length ? effective.deniedPermissions : deniedFromClaims);

  return {
    id: auth.userId,
    type: 'user',
    tenantId: buildTenantId(claims, options?.tenantId),
    roles: Array.from(roles),
    attrs: {
      userId: auth.userId,
      appointmentId: apt?.id ?? null,
      position: apt?.position ?? null,
      scopeType: apt?.scope?.type ?? null,
      scopeId: apt?.scope?.id ?? null,
      permissions,
      deniedPermissions,
      fieldRulesByAction: effective.fieldRulesByAction,
      policyVersion: effective.policyVersion,
    },
  };
}
