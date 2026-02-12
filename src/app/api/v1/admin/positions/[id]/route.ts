import { db } from '@/app/db/client';
import { positions } from '@/app/db/schema/auth/positions';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { positionUpdateSchema } from '@/app/lib/validators';
import { and, eq, ne} from 'drizzle-orm';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let actor: { type: 'user' | 'anonymous'; id: string } = { type: 'anonymous', id: 'unknown' };
    try {
      const authCtx = await requireAuth(req);
      actor = { type: 'user', id: authCtx.userId };
    } catch {}

    const { id: routeId } = await params;
    const rawId = decodeURIComponent(routeId ?? '').trim();

    const [row] = await db
      .select()
      .from(positions)
      .where(eq(positions.id, rawId))
      .limit(1);

    if (!row) throw new ApiError(404, 'Position not found');

    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'SUCCESS',
      actor,
      target: { type: AuditResourceType.POSITION, id: row.id },
      metadata: {
        description: `Position retrieved successfully: ${row.key}`,
        positionId: row.id,
      },
    });

    return json.ok({ message: 'Position retrieved successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCtx = await requireAuth(req);

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

    await req.audit.log({
      action: AuditEventType.POSITION_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.POSITION, id: row.id },
      metadata: {
        description: `Updated position ${row.key}`,
        positionId: row.id,
        changes: Object.keys(parsed.data),
      },
    });
    return json.ok({ message: 'Position updated successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCtx = await requireAuth(req);

    const { id: routeId } = await params;
    const rawId = decodeURIComponent(routeId ?? '').trim();

    const [row] = await db.delete(positions).where(eq(positions.id, rawId)).returning();
    if (!row) throw new ApiError(404, 'Position not found');

    await req.audit.log({
      action: AuditEventType.POSITION_DELETED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.POSITION, id: row.id },
      metadata: {
        description: `Deleted position ${rawId}`,
        positionId: row.id,
        hardDeleted: true,
      },
    });

    return json.ok({ message: 'Position deleted successfully.', data: row });
  } catch (err) {
    return handleApiError(err);
  }
}
export const GET = withAuditRoute('GET', withAuthz(GETHandler));

export const PATCH = withAuditRoute('PATCH', withAuthz(PATCHHandler));

export const DELETE = withAuditRoute('DELETE', withAuthz(DELETEHandler));
