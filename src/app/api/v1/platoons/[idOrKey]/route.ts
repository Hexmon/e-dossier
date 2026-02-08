import { db } from '@/app/db/client';
import { platoons } from '@/app/db/schema/auth/platoons';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { platoonUpdateSchema } from '@/app/lib/validators';
import { requireAuth } from '@/app/lib/authz';
import {
  withAuditRoute,
  AuditEventType,
  AuditResourceType,
} from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

type PgError = { code?: string; detail?: string };

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function whereForIdKeyName(idOrKey: string, includeDeleted = false) {
  const parts: any[] = [];
  if (!includeDeleted) parts.push(isNull(platoons.deletedAt));

  if (isUuid(idOrKey)) {
    parts.push(eq(platoons.id, idOrKey));
  } else {
    const up = idOrKey.toUpperCase();
    const lc = idOrKey.toLowerCase();
    parts.push(or(
      eq(platoons.key, up),
      sql`lower(${platoons.name}) = ${lc}`
    ));
  }
  return and(...parts);
}

// PATCH /api/v1/platoons/:idOrKey  (ADMIN)
// body: { key?, name?, about?, restore? }
async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ idOrKey: string }> }) {
  try {
    const adminCtx = await requireAuth(req);
    const { idOrKey } = await params;
    const body = await req.json();
    const parsed = platoonUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return json.badRequest('Validation failed', { issues: parsed.error.flatten() });
    }

    const { key, name, about, restore } = parsed.data;

    // Load target (include soft-deleted so we can restore)
    const [existing] = await db
      .select({
        id: platoons.id,
        key: platoons.key,
        name: platoons.name,
        about: platoons.about,
        deletedAt: platoons.deletedAt,
      })
      .from(platoons)
      .where(whereForIdKeyName(idOrKey, true))
      .limit(1);

    if (!existing) return json.notFound('Platoon not found.');

    // Uniqueness checks when changing key or name (ignore soft-deleted, exclude self)
    if (key || name) {
      const upKey = key ? key.toUpperCase() : null;
      const lcName = name ? name.trim().toLowerCase() : null;

      const clauses = [isNull(platoons.deletedAt), sql`${platoons.id} <> ${existing.id}`] as any[];

      if (upKey && lcName) {
        clauses.push(or(eq(platoons.key, upKey), sql`lower(${platoons.name}) = ${lcName}`));
      } else if (upKey) {
        clauses.push(eq(platoons.key, upKey));
      } else if (lcName) {
        clauses.push(sql`lower(${platoons.name}) = ${lcName}`);
      }

      if (clauses.length > 0) {
        const [dup] = await db
          .select({ id: platoons.id, key: platoons.key, name: platoons.name })
          .from(platoons)
          .where(and(...clauses))
          .limit(1);

        if (dup) {
          const by =
            upKey && dup.key === upKey ? 'key' :
              lcName && dup.name?.toLowerCase() === lcName ? 'name' :
                'key_or_name';
          return json.conflict(`Platoon ${by} already exists.`, { [by]: by === 'key' ? upKey : name?.trim() });
        }
      }
    }

    // Build updates
    const updates: Partial<typeof platoons.$inferInsert> = {};
    if (key) updates.key = key.toUpperCase();
    if (name) updates.name = name.trim();
    if ('about' in parsed.data) updates.about = about ?? null;
    if (restore === true) updates.deletedAt = null;
    if (restore === false) updates.deletedAt = new Date();

    const [updated] = await db
      .update(platoons)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(platoons.id, existing.id))
      .returning({
        id: platoons.id,
        key: platoons.key,
        name: platoons.name,
        about: platoons.about,
        createdAt: platoons.createdAt,
        updatedAt: platoons.updatedAt,
        deletedAt: platoons.deletedAt,
      });

    await req.audit.log({
      action: AuditEventType.PLATOON_UPDATED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.PLATOON, id: updated.id },
      metadata: {
        platoonId: updated.id,
        changes: Object.keys(parsed.data),
        description: `Updated platoon ${updated.key}`,
      },
    });
    return json.ok({ message: 'Platoon updated successfully.', platoon: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/v1/platoons/:idOrKey  (ADMIN)
 * - Soft delete by default (sets deleted_at = now)
 * - Hard delete with ?hard=true
 */
async function DELETEHandler(
  req: AuditNextRequest,
  { params }: { params: Promise<{ idOrKey: string }> | { idOrKey: string } | string },
) {
  try {
    const adminCtx = await requireAuth(req);
    const resolvedParams = typeof params === 'string' ? params : await params;
    const rawIdOrKey =
      typeof resolvedParams === 'string' ? resolvedParams : resolvedParams?.idOrKey;
    const idOrKey = decodeURIComponent(rawIdOrKey || '').trim();
    if (!idOrKey) throw new ApiError(400, 'idOrKey path param is required.', 'bad_request');

    // Find even if already soft-deleted (so we can hard-delete it)
    const [existing] = await db
      .select({
        id: platoons.id,
        key: platoons.key,
        name: platoons.name,
        deletedAt: platoons.deletedAt,
      })
      .from(platoons)
      .where(whereForIdKeyName(idOrKey, true))
      .limit(1);

    if (!existing) throw new ApiError(404, 'Platoon not found.', 'not_found');

    const hard = (new URL(req.url).searchParams.get('hard') || '').toLowerCase() === 'true';

    if (hard) {
      // Hard delete (be mindful of any downstream FKs you may add later)
      const [gone] = await db
        .delete(platoons)
        .where(eq(platoons.id, existing.id))
        .returning({ id: platoons.id, key: platoons.key, name: platoons.name });

      await req.audit.log({
        action: AuditEventType.PLATOON_DELETED,
        outcome: 'SUCCESS',
        actor: { type: 'user', id: adminCtx.userId },
        target: { type: AuditResourceType.PLATOON, id: gone.id },
        metadata: {
          platoonId: gone.id,
          hardDeleted: true,
          description: `Hard deleted platoon ${gone.key}`,
        },
      });
      return json.ok({
        message: 'Platoon hard-deleted.',
        platoon: gone,
      });
    }

    // Soft delete (no-op if already soft-deleted)
    const [updated] = await db
      .update(platoons)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(platoons.id, existing.id), isNull(platoons.deletedAt)))
      .returning({
        id: platoons.id,
        key: platoons.key,
        name: platoons.name,
        deletedAt: platoons.deletedAt,
      });

    const target = updated ?? {
      id: existing.id,
      key: existing.key,
      name: existing.name,
      deletedAt: existing.deletedAt,
    };

    await req.audit.log({
      action: AuditEventType.PLATOON_DELETED,
      outcome: 'SUCCESS',
      actor: { type: 'user', id: adminCtx.userId },
      target: { type: AuditResourceType.PLATOON, id: target.id },
      metadata: {
        platoonId: target.id,
        hardDeleted: false,
        alreadyDeleted: !updated,
        description: updated
          ? `Soft deleted platoon ${target.key}`
          : `Attempted to soft delete already deleted platoon ${target.key}`,
      },
    });

    if (updated) {
      return json.ok({
        message: 'Platoon soft-deleted.',
        platoon: updated,
      });
    }

    // Already soft-deleted -- return current state
    return json.ok({
      message: 'Platoon already soft-deleted.',
      platoon: target,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
