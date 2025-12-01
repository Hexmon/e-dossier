import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import {
    trainingCampParam,
    trainingCampUpdateSchema,
    trainingCampQuerySchema,
} from '@/app/lib/training-camp-validators';
import {
    getTrainingCamp,
    updateTrainingCamp,
    deleteTrainingCamp,
} from '@/app/db/queries/trainingCamps';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await requireAuth(req);
        const { campId } = trainingCampParam.parse(await ctx.params);
        const sp = new URL(req.url).searchParams;
        const qp = trainingCampQuerySchema.parse({
            includeActivities: sp.get('includeActivities') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });

        const row = await getTrainingCamp(campId, qp.includeActivities ?? false, qp.includeDeleted ?? false);
        if (!row) throw new ApiError(404, 'Training camp not found', 'not_found');
        return json.ok({ trainingCamp: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function PATCH(req: NextRequest, ctx: any) {
    try {
        await requireAdmin(req);
        const { campId } = trainingCampParam.parse(await ctx.params);
        const dto = trainingCampUpdateSchema.parse(await req.json());
        const row = await updateTrainingCamp(campId, { ...dto });
        if (!row) throw new ApiError(404, 'Training camp not found', 'not_found');
        return json.ok({ trainingCamp: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function DELETE(req: NextRequest, ctx: any) {
    try {
        await requireAdmin(req);
        const { campId } = trainingCampParam.parse(await ctx.params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteTrainingCamp(campId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Training camp not found', 'not_found');
        return json.ok({ deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}
