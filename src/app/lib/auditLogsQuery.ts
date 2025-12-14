import { z } from 'zod';
import { auditLogs } from '@/app/db/schema/auth/audit';
import { and, eq, gte, lte } from 'drizzle-orm';

export const auditLogQuerySchema = z.object({
  actorUserId: z.string().uuid().optional(),
  resourceType: z.string().max(128).optional(),
  resourceId: z.string().optional(),
  eventType: z.string().max(128).optional(),
  requestId: z.string().uuid().optional(),
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
