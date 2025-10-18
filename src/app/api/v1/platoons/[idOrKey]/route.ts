import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { platoons } from '@/app/db/schema/auth/platoons';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { json, handleApiError } from '@/app/lib/http';
import { platoonUpdateSchema } from '@/app/lib/validators';
import { requireAdmin } from '@/app/lib/authz';

type PgError = { code?: string; detail?: string };

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function whereForIdKeyName(idOrKey: string, includeDeleted = false) {
  const parts = [];
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
export async function PATCH(req: NextRequest, { params }: { params: { idOrKey: string } }) {
  try {
    requireAdmin(req);

    const body = await req.json();
    const parsed = platoonUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return json.badRequest('Validation failed', { issues: parsed.error.flatten() });
    }

    const { key, name, about, restore } = parsed.data;

    // Load the row (allow finding even if soft-deleted)
    const [existing] = await db
      .select({
        id: platoons.id,
        key: platoons.key,
        name: platoons.name,
        about: platoons.about,
        deletedAt: platoons.deletedAt,
      })
      .from(platoons)
      .where(whereForIdKeyName(params.idOrKey, true))
      .limit(1);

    if (!existing) return json.notFound('Platoon not found');

    // Build updates
    const updates: Partial<typeof platoons.$inferInsert> = {};
    if (key) updates.key = key.toUpperCase();
    if (name) updates.name = name.trim();
    if ('about' in parsed.data) updates.about = about ?? null;
    if (restore === true) updates.deletedAt = null;          // undelete (restore)
    if (restore === false) updates.deletedAt = new Date();   // optional: re-soft-delete

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

    return json.ok({ platoon: updated });
  } catch (err) {
    const e = err as PgError;
    if (e?.code === '23505') {
      return json.conflict('Platoon key already exists');
    }
    return handleApiError(err);
  }
}
