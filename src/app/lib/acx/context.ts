import type { Context, Resource } from '@hexmon_tech/acccess-control-core';

export type AuthzRequestMetadata = {
  action: string;
  resourceType: string;
  method: string;
  pathname: string;
  adminBaseline?: boolean;
};

function parseClientIp(req: Request): string | undefined {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return undefined;
}

export function buildDefaultResource(metadata: AuthzRequestMetadata): Resource {
  return {
    type: metadata.resourceType,
    attrs: {
      method: metadata.method,
      pathname: metadata.pathname,
      adminBaseline: Boolean(metadata.adminBaseline),
    },
  };
}

export function buildAuthzContext(req: Request, metadata: AuthzRequestMetadata): Context {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? undefined,
    env: process.env.NODE_ENV ?? 'development',
    request: {
      ip: parseClientIp(req),
      userAgent: req.headers.get('user-agent') ?? undefined,
    },
    authz: {
      action: metadata.action,
      resourceType: metadata.resourceType,
      method: metadata.method,
      pathname: metadata.pathname,
    },
  };
}

