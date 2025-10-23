import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError } from '@/app/lib/http';
import { requireAuth, hasAdminRole } from '@/app/lib/authz';
import { db } from '@/app/db/client';
import { ocCadets } from '@/app/db/schema/training/oc';
import { eq } from 'drizzle-orm';

export const Param = (name: string) => z.object({ [name]: z.string() });

export async function mustBeAuthed(req: NextRequest) {
    // returns { userId, roles, claims }
    return requireAuth(req);
}

export async function mustBeAdmin(req: NextRequest) {
    const { roles } = await requireAuth(req);
    if (!hasAdminRole(roles)) throw new ApiError(403, 'Admin privileges required', 'forbidden');
}

export async function parseParam<T extends z.ZodTypeAny>(
    ctx: { params: { [k: string]: string } } | { params: Promise<{ [k: string]: string }> },
    schema: T
): Promise<z.infer<T>> {
    const raw = await (ctx as any).params;
    // FIX: coerce to string before trim to avoid TS error
    const normalized = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, decodeURIComponent(String(v ?? '').trim())])
    );
    return schema.parse(normalized);
}

export async function ensureOcExists(ocId: string) {
    const [row] = await db.select({ id: ocCadets.id }).from(ocCadets).where(eq(ocCadets.id, ocId)).limit(1);
    if (!row) throw new ApiError(404, 'OC not found', 'not_found');
}
