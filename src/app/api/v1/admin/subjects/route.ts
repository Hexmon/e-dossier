import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { listQuerySchema, subjectCreateSchema } from '@/app/lib/validators.courses';
import { listSubjects } from '@/app/db/queries/subjects';
import { db } from '@/app/db/client';
import { subjects } from '@/app/db/schema/training/subjects';

export async function GET(req: NextRequest) {
    try {
        await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = listQuerySchema.parse({
            q: sp.get('q') ?? undefined,
            branch: sp.get('branch') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
            limit: sp.get('limit') ?? undefined,
            offset: sp.get('offset') ?? undefined,
        });
        const rows = await listSubjects({
            q: qp.q, branch: qp.branch as any,
            includeDeleted: qp.includeDeleted === 'true',
            limit: qp.limit, offset: qp.offset,
        });
        return json.ok({ message: 'Subjects retrieved successfully.', items: rows, count: rows.length });
    } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest) {
    try {
        await requireAdmin(req);
        const body = subjectCreateSchema.parse(await req.json());
        const [row] = await db
            .insert(subjects)
            .values({
                code: body.code,
                name: body.name,
                branch: body.branch,
                hasTheory: body.hasTheory ?? false,
                hasPractical: body.hasPractical ?? false,
                defaultTheoryCredits: body.defaultTheoryCredits ?? null,
                defaultPracticalCredits: body.defaultPracticalCredits ?? null,
                description: body.description ?? null,
            })
            .returning();
        return json.created({ message: 'Subject created successfully.', subject: row });
    } catch (err: any) {
        if (err?.code === '23505') return json.conflict('Subject code already exists.');
        return handleApiError(err);
    }
}
