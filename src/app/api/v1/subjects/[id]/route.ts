import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { subjectUpdateSchema } from '@/app/lib/validators.courses';
import { db } from '@/app/db/client';
import { subjects } from '@/app/db/schema/training/subjects';
import { eq } from 'drizzle-orm';

const Id = z.object({ id: z.string().uuid() });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth(req);
        const { id } = Id.parse(await params);
        const [row] = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
        if (!row) throw new ApiError(404, 'Subject not found', 'not_found');
        return json.ok({ message: 'Subject retrieved successfully.', subject: row });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(req);
        const { id } = Id.parse(await params);
        const body = subjectUpdateSchema.parse(await req.json());

        const patch: any = {};
        for (const k of ['code', 'name', 'branch', 'hasTheory', 'hasPractical', 'defaultTheoryCredits', 'defaultPracticalCredits', 'description'] as const) {
            if (k in body) (patch as any)[k] = (body as any)[k];
        }

        const [row] = await db.update(subjects).set(patch).where(eq(subjects.id, id)).returning();
        if (!row) throw new ApiError(404, 'Subject not found', 'not_found');
        return json.ok({ message: 'Subject updated successfully.', subject: row });
    } catch (err: any) {
        if (err?.code === '23505') return json.conflict('Subject code already exists.');
        return handleApiError(err);
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(req);
        const { id } = Id.parse(await params);
        const [row] = await db
            .update(subjects)
            .set({ deletedAt: new Date() })
            .where(eq(subjects.id, id))
            .returning({ id: subjects.id });
        if (!row) throw new ApiError(404, 'Subject not found', 'not_found');
        return json.ok({ message: 'Subject soft-deleted.', id: row.id });
    } catch (err) { return handleApiError(err); }
}
