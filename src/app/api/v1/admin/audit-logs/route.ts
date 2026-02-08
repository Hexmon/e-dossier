import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { db } from '@/app/db/client';
import { auditLogs } from '@/app/db/schema/auth/audit';
import { desc, sql } from 'drizzle-orm';
import { withAuditRoute } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { auditLogQuerySchema, buildAuditLogFilters } from '@/app/lib/auditLogsQuery';

async function GETHandler(req: AuditNextRequest) {
  try {
    await requireAuth(req);
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
    const filters = buildAuditLogFilters(parsed);

    const [items, totalRow] = await Promise.all([
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
        .where(filters)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(auditLogs)
        .where(filters ?? undefined),
    ]);

    return json.ok({
      message: 'Audit logs retrieved successfully.',
      items,
      count: items.length,
      total: totalRow[0]?.count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = withAuditRoute('GET', GETHandler);
