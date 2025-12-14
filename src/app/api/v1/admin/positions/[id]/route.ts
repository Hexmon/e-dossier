import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { positions } from '@/app/db/schema/auth/positions';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { positionUpdateSchema } from '@/app/lib/validators';
import { and, eq, ne} from 'drizzle-orm';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: routeId } = await params;
    const rawId = decodeURIComponent(routeId ?? '').trim();

    const [row] = await db
      .select()
      .from(positions)
      .where(eq(positions.id, rawId))
      .limit(1);

    if (!row) throw new ApiError(404, 'Position not found');
    return json.ok({ message: 'Position retrieved successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCtx = await requireAdmin(req);

    const { id: routeId } = await params;
    const rawId = decodeURIComponent(routeId ?? '').trim();

    const body = await req.json();
    const parsed = positionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'Validation failed', 'bad_request', parsed.error.flatten());
    }

    // Ensure the row exists first
    const [existing] = await db.select().from(positions).where(eq(positions.id, rawId)).limit(1);
    if (!existing) throw new ApiError(404, 'Position not found');

    // Uniqueness check for displayName (if provided)
    if (parsed.data.displayName && parsed.data.displayName.trim().length > 0) {
      const [conflictByName] = await db
        .select({ id: positions.id })
        .from(positions)
        .where(and(
          eq(positions.displayName, parsed.data.displayName.trim()),
          ne(positions.id, rawId)
        ))
        .limit(1);

      if (conflictByName) {
        // 409 with a clear field-level hint
        return json.conflict('Display name already exists.', {
          field: 'displayName',
          value: parsed.data.displayName.trim(),
        });
      }
    }

    const [row] = await db
      .update(positions)
      .set({
        ...(parsed.data.displayName !== undefined ? { displayName: parsed.data.displayName } : {}),
        ...(parsed.data.defaultScope !== undefined ? { defaultScope: parsed.data.defaultScope } : {}),
        ...(parsed.data.singleton !== undefined ? { singleton: parsed.data.singleton } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      })
      .where(eq(positions.id, rawId))
      .returning();

    if (!row) throw new ApiError(404, 'Position not found');

    await createAuditLog({
      actorUserId: adminCtx.userId,
      eventType: AuditEventType.POSITION_UPDATED,
      resourceType: AuditResourceType.POSITION,
      resourceId: row.id,
      description: `Updated position ${row.key}`,
      metadata: {
        positionId: row.id,
        changes: Object.keys(parsed.data),
      },
      before: existing,
      after: row,
      changedFields: Object.keys(parsed.data),
      request: req,
      required: true,
    });
    return json.ok({ message: 'Position updated successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCtx = await requireAdmin(req);

    const { id: routeId } = await params;
    const rawId = decodeURIComponent(routeId ?? '').trim();

    const [row] = await db.delete(positions).where(eq(positions.id, rawId)).returning();
    if (!row) throw new ApiError(404, 'Position not found');

    await createAuditLog({
      actorUserId: adminCtx.userId,
      eventType: AuditEventType.POSITION_DELETED,
      resourceType: AuditResourceType.POSITION,
      resourceId: row.id,
      description: `Deleted position ${rawId}`,
      metadata: {
        positionId: row.id,
        hardDeleted: true,
      },
      before: row,
      after: null,
      request: req,
      required: true,
    });

    return json.ok({ message: 'Position deleted successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
