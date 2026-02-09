import { z } from 'zod';
import { auditLogs } from '@/app/db/schema/auth/audit';
import { auditEvents } from '@/app/db/schema/auth/audit-events';
import { and, eq, gte, lte, sql } from 'drizzle-orm';

export const auditLogQuerySchema = z.object({
  actorUserId: z.string().max(128).optional(),
  resourceType: z.string().max(128).optional(),
  resourceId: z.string().optional(),
  eventType: z.string().max(128).optional(),
  requestId: z.string().max(128).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).max(5000).optional(),
});

export type AuditLogQueryParams = z.infer<typeof auditLogQuerySchema>;

export function buildAuditLogFilters(params: AuditLogQueryParams) {
  const clauses = [];
  if (params.actorUserId) clauses.push(eq(auditLogs.actorUserId, params.actorUserId));
  if (params.resourceType) clauses.push(eq(auditLogs.resourceType, params.resourceType));
  if (params.resourceId) clauses.push(eq(auditLogs.resourceId, params.resourceId));
  if (params.eventType) clauses.push(eq(auditLogs.eventType, params.eventType));
  if (params.requestId) clauses.push(eq(auditLogs.requestId, params.requestId));
  if (params.from) clauses.push(gte(auditLogs.createdAt, params.from));
  if (params.to) clauses.push(lte(auditLogs.createdAt, params.to));
  return clauses.length ? and(...clauses) : undefined;
}

export const auditEventRequestIdExpr = sql<string | null>`
  COALESCE(
    ${auditEvents.context} ->> 'requestId',
    ${auditEvents.context} ->> 'request_id'
  )
`;

export const auditEventMethodExpr = sql<string | null>`
  COALESCE(
    ${auditEvents.context} ->> 'method',
    ${auditEvents.context} ->> 'httpMethod'
  )
`;

export const auditEventPathExpr = sql<string | null>`
  COALESCE(
    ${auditEvents.context} ->> 'path',
    ${auditEvents.context} ->> 'pathname',
    ${auditEvents.context} ->> 'route'
  )
`;

export const auditEventStatusCodeExpr = sql<number | null>`
  NULLIF(
    COALESCE(
      ${auditEvents.context} ->> 'statusCode',
      ${auditEvents.context} ->> 'status_code'
    ),
    ''
  )::int
`;

export function buildAuditEventFilters(params: AuditLogQueryParams) {
  const clauses = [];
  if (params.actorUserId) clauses.push(eq(auditEvents.actorId, params.actorUserId));
  if (params.resourceType) clauses.push(eq(auditEvents.targetType, params.resourceType));
  if (params.resourceId) clauses.push(eq(auditEvents.targetId, params.resourceId));
  if (params.eventType) clauses.push(eq(auditEvents.action, params.eventType));
  if (params.requestId) clauses.push(sql`${auditEventRequestIdExpr} = ${params.requestId}`);
  if (params.from) clauses.push(gte(auditEvents.occurredAt, params.from));
  if (params.to) clauses.push(lte(auditEvents.occurredAt, params.to));
  return clauses.length ? and(...clauses) : undefined;
}
