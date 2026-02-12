import { z } from 'zod';

export const runtime = 'nodejs';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
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
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await requireAuth(req);
        const { campId } = trainingCampParam.parse(await params);
        const sp = new URL(req.url).searchParams;
        const qp = trainingCampQuerySchema.parse({
            includeActivities: sp.get('includeActivities') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });

        const row = await getTrainingCamp(campId, qp.includeActivities ?? false, qp.includeDeleted ?? false);
        if (!row) throw new ApiError(404, 'Training camp not found', 'not_found');
        return json.ok({ message: 'Training camp retrieved successfully.', trainingCamp: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { campId } = trainingCampParam.parse(await params);
        const dto = trainingCampUpdateSchema.parse(await req.json());
        const row = await updateTrainingCamp(campId, { ...dto });
        if (!row) throw new ApiError(404, 'Training camp not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.TRAINING_CAMP_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.TRAINING_CAMP, id: row.id },
            metadata: {
                description: `Updated training camp ${row.name}`,
                trainingCampId: row.id,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'Training camp updated successfully.', trainingCamp: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { campId } = trainingCampParam.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteTrainingCamp(campId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Training camp not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.TRAINING_CAMP_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.TRAINING_CAMP, id: row.id },
            metadata: {
                description: `${body?.hard ? 'Hard' : 'Soft'} deleted training camp ${campId}`,
                trainingCampId: row.id,
                hardDeleted: body?.hard === true,
            },
        });
        return json.ok({ message: 'Training camp deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', withAuthz(GETHandler));

export const PATCH = withAuditRoute('PATCH', withAuthz(PATCHHandler));

export const DELETE = withAuditRoute('DELETE', withAuthz(DELETEHandler));
