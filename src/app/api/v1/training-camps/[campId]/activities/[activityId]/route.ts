import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import {
    trainingCampActivityParam,
    trainingCampActivityUpdateSchema,
} from '@/app/lib/training-camp-validators';
import {
    getTrainingCampActivity,
    updateTrainingCampActivity,
    deleteTrainingCampActivity,
} from '@/app/db/queries/trainingCamps';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await requireAuth(req);
        const { activityId } = trainingCampActivityParam.parse(await ctx.params);
        const row = await getTrainingCampActivity(activityId);
        if (!row) throw new ApiError(404, 'Training camp activity not found', 'not_found');
        return json.ok({ message: 'Training camp activity retrieved successfully.', activity: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function PATCH(req: NextRequest, ctx: any) {
    try {
        await requireAdmin(req);
        const { activityId } = trainingCampActivityParam.parse(await ctx.params);
        const dto = trainingCampActivityUpdateSchema.parse(await req.json());
        const row = await updateTrainingCampActivity(activityId, { ...dto });
        if (!row) throw new ApiError(404, 'Training camp activity not found', 'not_found');
        return json.ok({ message: 'Training camp activity updated successfully.', activity: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function DELETE(req: NextRequest, ctx: any) {
    try {
        await requireAdmin(req);
        const { activityId } = trainingCampActivityParam.parse(await ctx.params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteTrainingCampActivity(activityId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Training camp activity not found', 'not_found');
        return json.ok({ message: 'Training camp activity deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}
