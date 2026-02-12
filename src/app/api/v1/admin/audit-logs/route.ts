import { json, handleApiError } from '@/app/lib/http';

export const runtime = 'nodejs';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAuth } from '@/app/lib/authz';
import { db } from '@/app/db/client';
import { auditLogs } from '@/app/db/schema/auth/audit';
import { auditEvents } from '@/app/db/schema/auth/audit-events';
import { desc, sql } from 'drizzle-orm';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import {
  auditLogQuerySchema,
  buildAuditLogFilters,
  buildAuditEventFilters,
  auditEventMethodExpr,
  auditEventPathExpr,
  auditEventRequestIdExpr,
  auditEventStatusCodeExpr,
} from '@/app/lib/auditLogsQuery';

type AuditLogListItem = {
  id: string;
  actorUserId: string | null;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
  description: string | null;
  metadata: unknown;
  ipAddr: string | null;
  userAgent: string | null;
  requestId: string | null;
  method: string | null;
  path: string | null;
  outcome: string | null;
  statusCode: number | null;
  createdAt: Date;
};

async function GETHandler(req: AuditNextRequest) {
  try {
    const authCtx = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const parsed = auditLogQuerySchema.parse({
      actorUserId: searchParams.get('actorUserId') ?? undefined,
      resourceType: searchParams.get('resourceType') ?? undefined,
      resourceId: searchParams.get('resourceId') ?? undefined,
      eventType: searchParams.get('eventType') ?? undefined,
      requestId: searchParams.get('requestId') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    const limit = parsed.limit ?? 100;
    const offset = parsed.offset ?? 0;
    const fetchLimit = limit + offset;
    const legacyFilters = buildAuditLogFilters(parsed);
    const eventFilters = buildAuditEventFilters(parsed);

    const [legacyItems, legacyTotalRow, eventItems, eventTotalRow] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          actorUserId: auditLogs.actorUserId,
          eventType: auditLogs.eventType,
          resourceType: auditLogs.resourceType,
          resourceId: auditLogs.resourceId,
          description: auditLogs.description,
          metadata: auditLogs.metadata,
          ipAddr: auditLogs.ipAddr,
          userAgent: auditLogs.userAgent,
          requestId: auditLogs.requestId,
          method: auditLogs.method,
          path: auditLogs.path,
          outcome: auditLogs.outcome,
          statusCode: auditLogs.statusCode,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(legacyFilters)
        .orderBy(desc(auditLogs.createdAt))
        .limit(fetchLimit),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(auditLogs)
        .where(legacyFilters ?? undefined),
      db
        .select({
          id: auditEvents.eventId,
          actorUserId: auditEvents.actorId,
          eventType: auditEvents.action,
          resourceType: auditEvents.targetType,
          resourceId: auditEvents.targetId,
          description: sql<string | null>`
            COALESCE(
              ${auditEvents.metadata} ->> 'description',
              ${auditEvents.targetDisplayName}
            )
          `,
          metadata: auditEvents.metadata,
          ipAddr: auditEvents.actorIp,
          userAgent: auditEvents.actorUserAgent,
          requestId: auditEventRequestIdExpr,
          method: auditEventMethodExpr,
          path: auditEventPathExpr,
          outcome: auditEvents.outcome,
          statusCode: auditEventStatusCodeExpr,
          createdAt: auditEvents.occurredAt,
        })
        .from(auditEvents)
        .where(eventFilters)
        .orderBy(desc(auditEvents.occurredAt))
        .limit(fetchLimit),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(auditEvents)
        .where(eventFilters ?? undefined),
    ]);

    const allItems: AuditLogListItem[] = [
      ...legacyItems.map((item) => ({ ...item, id: String(item.id) })),
      ...eventItems.map((item) => ({ ...item, createdAt: new Date(item.createdAt) })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const items = allItems.slice(offset, offset + limit);
    const total = (legacyTotalRow[0]?.count ?? 0) + (eventTotalRow[0]?.count ?? 0);

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: authCtx.userId },
      target: { type: AuditResourceType.API, id: 'admin.audit-logs' },
      metadata: {
        description: 'Audit logs retrieved via /api/v1/admin/audit-logs',
        filters: {
          actorUserId: parsed.actorUserId ?? null,
          resourceType: parsed.resourceType ?? null,
          resourceId: parsed.resourceId ?? null,
          eventType: parsed.eventType ?? null,
          requestId: parsed.requestId ?? null,
          from: parsed.from?.toISOString() ?? null,
          to: parsed.to?.toISOString() ?? null,
        },
        limit,
        offset,
        count: items.length,
        total,
      },
    });

    return json.ok({
      message: 'Audit logs retrieved successfully.',
      items,
      count: items.length,
      total,
      limit,
      offset,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
