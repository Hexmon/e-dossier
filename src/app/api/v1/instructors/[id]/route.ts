import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { instructorUpdateSchema } from '@/app/lib/validators.courses';
import { db } from '@/app/db/client';
import { instructors } from '@/app/db/schema/training/instructors';
import { eq } from 'drizzle-orm';

const Id = z.object({ id: z.string().uuid() });

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth(req);
        const { id } = Id.parse(await ctx.params);
        const [row] = await db.select().from(instructors).where(eq(instructors.id, id)).limit(1);
        if (!row) throw new ApiError(404, 'Instructor not found', 'not_found');
        return json.ok({ instructor: row });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(req);
        const { id } = Id.parse(await ctx.params);
        const body = instructorUpdateSchema.parse(await req.json());
        const [row] = await db.update(instructors).set({ ...body }).where(eq(instructors.id, id)).returning();
        if (!row) throw new ApiError(404, 'Instructor not found', 'not_found');
        return json.ok({ instructor: row });
    } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(req);
        const { id } = Id.parse(await ctx.params);
        const [row] = await db.update(instructors).set({ deletedAt: new Date() }).where(eq(instructors.id, id)).returning({ id: instructors.id });
        if (!row) throw new ApiError(404, 'Instructor not found', 'not_found');
        return json.ok({ message: 'Instructor soft-deleted', id: row.id });
    } catch (err) { return handleApiError(err); }
}
