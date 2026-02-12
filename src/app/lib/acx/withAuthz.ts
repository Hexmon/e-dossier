import type { AuthorizationEngine, Context, Decision, Principal, Resource } from '@hexmon_tech/acccess-control-core';
import type { NextRequest } from 'next/server';
import { ApiError, json } from '@/app/lib/http';
import { AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { resolveApiAction, type ApiActionEntry } from './action-map';
import { getAuthzEngine } from './engine';
import { isAuthzV2Enabled } from './feature-flag';
import { buildAuthzContext, buildDefaultResource } from './context';
import { buildPrincipalFromRequest } from './principal';
import { applyFieldObligations } from './obligations';

type RouteContext<TParams = Record<string, string | string[] | undefined>> = {
  params: Promise<TParams>;
};

type AuditableRequest = Request & {
  audit?: {
    log: (event: Record<string, unknown>) => Promise<void> | void;
  };
};

export type AuthzRouteHandler<TParams = Record<string, string | string[] | undefined>> = (
  req: AuditNextRequest,
  context: RouteContext<TParams>
) => Promise<Response> | Response;

export type WithAuthzOptions<TParams = Record<string, string | string[] | undefined>> = {
  action?: string | ((req: AuditNextRequest, context: RouteContext<TParams>, mapped: ApiActionEntry | null) => string | Promise<string>);
  getPrincipal?: (req: AuditNextRequest, context: RouteContext<TParams>) => Principal | Promise<Principal>;
  getResource?: (
    req: AuditNextRequest,
    context: RouteContext<TParams>,
    mapped: ApiActionEntry | null,
    action: string
  ) => Resource | Promise<Resource>;
  getContext?: (
    req: AuditNextRequest,
    context: RouteContext<TParams>,
    mapped: ApiActionEntry | null,
    action: string,
    resource: Resource
  ) => Context | Promise<Context>;
  getFields?: (req: AuditNextRequest, context: RouteContext<TParams>) => string[] | Promise<string[]>;
  engine?: AuthorizationEngine;
  onDeny?: (decision: Decision, req: AuditNextRequest, context: RouteContext<TParams>) => void | Promise<void>;
};

type DecisionAuditArgs = {
  req: AuditNextRequest;
  principal: Principal;
  action: string;
  resource: Resource;
  decision: Decision & {
    allow: boolean;
  };
  obligationsApplied?: unknown[];
};

async function emitDecisionAudit({
  req,
  principal,
  action,
  resource,
  decision,
  obligationsApplied,
}: DecisionAuditArgs): Promise<void> {
  const auditableReq = req as unknown as AuditableRequest;
  const logger = auditableReq.audit?.log;
  if (!logger) return;

  await logger({
    action: AuditEventType.API_REQUEST,
    outcome: decision.allow ? 'SUCCESS' : 'FAILURE',
    actor: { type: 'user', id: principal.id },
    target: { type: AuditResourceType.API, id: resource.id ?? action },
    metadata: {
      description: `Authorization ${decision.allow ? 'allow' : 'deny'} for ${action}`,
      authz: {
        action,
        resourceType: resource.type,
        allow: decision.allow,
        reasons: decision.reasons,
        obligations: decision.obligations,
        obligationsApplied: obligationsApplied ?? [],
        traceId: decision.meta.traceId,
        engine: decision.meta.engine,
      },
      path: new URL(req.url).pathname,
      method: req.method,
    },
  });
}

function isMutableMethod(method: string): boolean {
  const upper = method.toUpperCase();
  return upper === 'PATCH' || upper === 'PUT';
}

function patchRequestJson(req: AuditNextRequest, payload: unknown): void {
  Object.defineProperty(req, 'json', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: async () => payload,
  });
}

async function readRequestJsonObject(req: AuditNextRequest): Promise<Record<string, unknown> | null> {
  try {
    if (typeof (req as Request).clone === 'function') {
      const probe = await (req as Request).clone().json();
      if (probe && typeof probe === 'object' && !Array.isArray(probe)) return probe as Record<string, unknown>;
      return null;
    }
  } catch {
    return null;
  }

  try {
    const probe = await req.json();
    if (probe && typeof probe === 'object' && !Array.isArray(probe)) {
      patchRequestJson(req, probe);
      return probe as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function extractFieldRuleObligations(principal: Principal, action: string): Array<{ type: string; payload?: unknown }> {
  const attrs = (principal.attrs ?? {}) as Record<string, unknown>;
  const fieldRulesByAction = attrs.fieldRulesByAction as Record<
    string,
    Array<{ mode: 'ALLOW' | 'DENY' | 'OMIT' | 'MASK'; fields?: string[] }>
  >;
  const rules = fieldRulesByAction?.[action] ?? [];
  const obligations: Array<{ type: string; payload?: unknown }> = [];

  for (const rule of rules) {
    const fields = Array.isArray(rule.fields) ? rule.fields : [];
    if (rule.mode === 'ALLOW') {
      obligations.push({ type: 'allowFields', payload: { fields } });
      continue;
    }
    if (rule.mode === 'OMIT') {
      obligations.push({ type: 'omitFields', payload: { fields } });
      continue;
    }
    if (rule.mode === 'MASK') {
      obligations.push({ type: 'maskFields', payload: { fields } });
      continue;
    }
    if (rule.mode === 'DENY') {
      if (fields.length > 0) {
        obligations.push({
          type: 'denyFields',
          payload: {
            fields,
            reason: `Denied update for restricted fields: ${fields.join(', ')}`,
          },
        });
      } else {
        obligations.push({
          type: 'deny',
          payload: {
            reason: 'Denied by field rule',
          },
        });
      }
    }
  }

  return obligations;
}

async function resolveAction<TParams>(
  req: AuditNextRequest,
  context: RouteContext<TParams>,
  mapped: ApiActionEntry | null,
  actionResolver?: WithAuthzOptions<TParams>['action']
): Promise<string | null> {
  if (typeof actionResolver === 'function') {
    return await actionResolver(req, context, mapped);
  }
  if (typeof actionResolver === 'string' && actionResolver.trim().length > 0) {
    return actionResolver;
  }
  return mapped?.action ?? null;
}

function mapAuthError(error: unknown): Response | null {
  if (error instanceof ApiError) {
    if (error.status === 401) return json.unauthorized(error.message);
    if (error.status === 403) return json.forbidden(error.message);
    if (error.status === 400) return json.badRequest(error.message);
  }
  return null;
}

export function withAuthz<TParams = Record<string, string | string[] | undefined>>(
  handler: AuthzRouteHandler<TParams>,
  options: WithAuthzOptions<TParams> = {}
): AuthzRouteHandler<TParams> {
  return async (req: AuditNextRequest, context: RouteContext<TParams>) => {
    if (!isAuthzV2Enabled()) {
      return handler(req, context);
    }

    const pathname = new URL(req.url).pathname;
    const mapped = resolveApiAction(req.method, pathname);
    const action = await resolveAction(req, context, mapped, options.action);

    if (!action) {
      return json.badRequest('Authorization action mapping missing for route', {
        method: req.method,
        path: pathname,
      });
    }

    const method = req.method.toUpperCase();
    const mutablePayload = isMutableMethod(method) ? await readRequestJsonObject(req) : null;
    const resource = options.getResource
      ? await options.getResource(req, context, mapped, action)
      : buildDefaultResource({
          action,
          resourceType: mapped?.resourceType ?? 'api',
          method,
          pathname,
          adminBaseline: mapped?.adminBaseline ?? false,
        });

    try {
      const principal = options.getPrincipal
        ? await options.getPrincipal(req, context)
        : await buildPrincipalFromRequest(req as NextRequest);
      const decisionContext = options.getContext
        ? await options.getContext(req, context, mapped, action, resource)
        : buildAuthzContext(req, {
            action,
            resourceType: resource.type,
            method,
            pathname,
            adminBaseline: Boolean(resource.attrs && (resource.attrs as Record<string, unknown>).adminBaseline),
          });
      const fields = options.getFields
        ? await options.getFields(req, context)
        : mutablePayload
          ? Object.keys(mutablePayload)
          : undefined;
      const engine = options.engine ?? getAuthzEngine();

      const decision = await engine.authorize({
        principal,
        resource,
        action: {
          name: action,
          fields,
        },
        context: decisionContext,
      });

      const extraObligations = extractFieldRuleObligations(principal, action);
      const combinedObligations = [...decision.obligations, ...extraObligations];
      let finalAllow = decision.allow;
      let sanitizedPayload = mutablePayload;
      let obligationMeta: unknown[] = combinedObligations;

      if (finalAllow && mutablePayload && combinedObligations.length > 0) {
        const fieldResult = applyFieldObligations(mutablePayload, combinedObligations);
        sanitizedPayload = fieldResult.payload;
        obligationMeta = [
          ...combinedObligations,
          {
            type: 'fieldResult',
            payload: {
              omittedFields: fieldResult.omittedFields,
              maskedFields: fieldResult.maskedFields,
              deniedFields: fieldResult.deniedFields,
              allowedFields: fieldResult.allowedFields,
            },
          },
        ];
        if (!fieldResult.allow) {
          finalAllow = false;
        }
      }

      if (finalAllow && mutablePayload && sanitizedPayload) {
        patchRequestJson(req, sanitizedPayload);
      }

      await emitDecisionAudit({
        req,
        principal,
        action,
        resource,
        decision: {
          ...decision,
          allow: finalAllow,
          obligations: combinedObligations,
        },
        obligationsApplied: obligationMeta,
      });

      if (!finalAllow) {
        if (options.onDeny) {
          await options.onDeny(decision, req, context);
        }
        return json.forbidden('Access denied by authorization policy.', {
          authz: {
            action,
            allow: false,
            reasons: decision.reasons,
            obligations: combinedObligations,
            traceId: decision.meta.traceId,
          },
        });
      }

      return handler(req, context);
    } catch (error) {
      const mappedError = mapAuthError(error);
      if (mappedError) return mappedError;
      throw error;
    }
  };
}
