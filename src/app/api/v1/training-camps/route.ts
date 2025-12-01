import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import {
    trainingCampCreateSchema,
    trainingCampQuerySchema,
} from '@/app/lib/training-camp-validators';
import {
    listTrainingCamps,
    createTrainingCamp,
} from '@/app/db/queries/trainingCamps';

export async function GET(req: NextRequest) {
    try {
        await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = trainingCampQuerySchema.parse({
            semester: sp.get('semester') ?? undefined,
            includeActivities: sp.get('includeActivities') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });

        const items = await listTrainingCamps({
            semester: qp.semester,
            includeActivities: qp.includeActivities ?? false,
            includeDeleted: qp.includeDeleted ?? false,
        });

        return json.ok({ items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function POST(req: NextRequest) {
    try {
        await requireAdmin(req);
        const dto = trainingCampCreateSchema.parse(await req.json());
        const row = await createTrainingCamp({
            name: dto.name.trim(),
            semester: dto.semester,
            maxTotalMarks: dto.maxTotalMarks,
        });
        return json.created({ trainingCamp: row });
    } catch (err) {
        return handleApiError(err);
    }
}
