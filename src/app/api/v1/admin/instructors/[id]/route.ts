import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { instructorUpdateSchema } from '@/app/lib/validators.courses';
import { db } from '@/app/db/client';
import { instructors } from '@/app/db/schema/training/instructors';
import { eq } from 'drizzle-orm';
import { hardDeleteInstructor, softDeleteInstructor } from '@/app/db/queries/instructors';

const Id = z.object({ id: z.string().uuid() });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth(req);
        const { id } = Id.parse(await params);
        const [row] = await db.select().from(instructors).where(eq(instructors.id, id)).limit(1);
        if (!row) throw new ApiError(404, 'Instructor not found', 'not_found');
        return json.ok({ message: 'Instructor retrieved successfully.', instructor: row });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(req);
        const { id } = Id.parse(await params);
        const body = instructorUpdateSchema.parse(await req.json());
        const [row] = await db.update(instructors).set({ ...body }).where(eq(instructors.id, id)).returning();
        if (!row) throw new ApiError(404, 'Instructor not found', 'not_found');
        return json.ok({ message: 'Instructor updated successfully.', instructor: row });
    } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(req);
        const { id } = Id.parse(await params);
        const hard = (new URL(req.url).searchParams.get('hard') || '').toLowerCase() === 'true';
        const row = hard ? await hardDeleteInstructor(id) : await softDeleteInstructor(id);
        if (!row) throw new ApiError(404, 'Instructor not found', 'not_found');
        return json.ok({ message: hard ? 'Instructor hard-deleted.' : 'Instructor soft-deleted.', id: row.id });
    } catch (err) { return handleApiError(err); }
}
