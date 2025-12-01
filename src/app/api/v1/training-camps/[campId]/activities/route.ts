import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import {
    trainingCampParam,
    trainingCampActivityCreateSchema,
    trainingCampActivityQuerySchema,
} from '@/app/lib/training-camp-validators';
import {
    listTrainingCampActivities,
    createTrainingCampActivity,
    getTrainingCamp,
} from '@/app/db/queries/trainingCamps';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await requireAuth(req);
        const { campId } = trainingCampParam.parse(await ctx.params);

        const sp = new URL(req.url).searchParams;
        const qp = trainingCampActivityQuerySchema.parse({
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });

        const activities = await listTrainingCampActivities(campId, { includeDeleted: qp.includeDeleted ?? false });
        return json.ok({ items: activities, count: activities.length });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function POST(req: NextRequest, ctx: any) {
    try {
        await requireAdmin(req);
        const { campId } = trainingCampParam.parse(await ctx.params);
        const camp = await getTrainingCamp(campId);
        if (!camp) throw new ApiError(404, 'Training camp not found', 'not_found');

        const dto = trainingCampActivityCreateSchema.parse(await req.json());
        const row = await createTrainingCampActivity(campId, {
            name: dto.name.trim(),
            defaultMaxMarks: dto.defaultMaxMarks,
            sortOrder: dto.sortOrder ?? 0,
        });
        return json.created({ activity: row });
    } catch (err) {
        return handleApiError(err);
    }
}
