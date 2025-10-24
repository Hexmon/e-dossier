import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { listQuerySchema, instructorCreateSchema } from '@/app/lib/validators.courses';
import { listInstructors } from '@/app/db/queries/instructors';
import { db } from '@/app/db/client';
import { instructors } from '@/app/db/schema/training/instructors';

export async function GET(req: NextRequest) {
    try {
        await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({
            q: sp.get('q') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
            limit: sp.get('limit') ?? undefined,
            offset: sp.get('offset') ?? undefined,
        });
        const rows = await listInstructors({
            q: qp.q,
            includeDeleted: qp.includeDeleted === 'true',
            limit: qp.limit, offset: qp.offset,
        });
        return json.ok({ items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest) {
    try {
        await requireAdmin(req);
        const body = instructorCreateSchema.parse(await req.json());
        const [row] = await db
            .insert(instructors)
            .values({
                userId: body.userId ?? null,
                name: body.name,
                email: body.email ?? null,
                phone: body.phone ?? null,
                affiliation: body.affiliation ?? null,
                notes: body.notes ?? null,
            })
            .returning();
        return json.created({ instructor: row });
    } catch (err) { return handleApiError(err); }
}
