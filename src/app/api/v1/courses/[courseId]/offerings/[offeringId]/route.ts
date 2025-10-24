import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { offeringUpdateSchema } from '@/app/lib/validators.courses';
import { updateOffering, replaceOfferingInstructors, softDeleteOffering } from '@/app/db/queries/offerings';

const Param = z.object({ courseId: z.string().uuid(), offeringId: z.string().uuid() });

export async function GET(_: NextRequest, ctx: { params: Promise<{ courseId: string; offeringId: string }> }) {
    try {
        await requireAuth(_);
        const { offeringId } = Param.parse(await ctx.params);
        // For brevity, reuse updateOffering with no patch to read?
        // Do a proper select instead in your real code.
        const row = await updateOffering(offeringId, {});
        if (!row) throw new ApiError(404, 'Offering not found', 'not_found');
        return json.ok({ offering: row });
    } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ courseId: string; offeringId: string }> }) {
    try {
        await requireAdmin(req);
        const { offeringId } = Param.parse(await ctx.params);
        const body = offeringUpdateSchema.parse(await req.json());

        const patch: any = {};
        for (const k of ['includeTheory', 'includePractical', 'theoryCredits', 'practicalCredits'] as const) {
            if (k in body) (patch as any)[k] = (body as any)[k];
        }

        const updated = await updateOffering(offeringId, patch);
        if (!updated) throw new ApiError(404, 'Offering not found', 'not_found');

        if (body.instructors) {
            await replaceOfferingInstructors(offeringId, body.instructors);
        }

        return json.ok({ offering: updated });
    } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ courseId: string; offeringId: string }> }) {
    try {
        await requireAdmin(req);
        const { offeringId } = Param.parse(await ctx.params);
        const row = await softDeleteOffering(offeringId);
        if (!row) throw new ApiError(404, 'Offering not found', 'not_found');
        return json.ok({ message: 'Offering soft-deleted', id: row.id });
    } catch (err) { return handleApiError(err); }
}
