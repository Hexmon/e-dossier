import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptTaskCreateSchema, ptTaskQuerySchema, ptTypeParam } from '@/app/lib/physical-training-validators';
import { getPtType, listPtTasks, createPtTask } from '@/app/db/queries/physicalTraining';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ typeId: string }> }) {
    try {
        await requireAuth(req);
        const { typeId } = ptTypeParam.parse(await params);
        const type = await getPtType(typeId);
        if (!type) throw new ApiError(404, 'PT type not found', 'not_found');

        const sp = new URL(req.url).searchParams;
        const qp = ptTaskQuerySchema.parse({
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });
        const items = await listPtTasks(typeId, { includeDeleted: qp.includeDeleted ?? false });
        return json.ok({ message: 'PT tasks retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ typeId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { typeId } = ptTypeParam.parse(await params);
        const type = await getPtType(typeId);
        if (!type) throw new ApiError(404, 'PT type not found', 'not_found');

        const dto = ptTaskCreateSchema.parse(await req.json());
        const row = await createPtTask(typeId, {
            title: dto.title.trim(),
            maxMarks: dto.maxMarks,
            sortOrder: dto.sortOrder ?? 0,
        });

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.PT_TASK_CREATED,
            resourceType: AuditResourceType.PT_TASK,
            resourceId: row.id,
            description: `Created PT task ${row.title} for type ${type.code}`,
            metadata: {
                ptTaskId: row.id,
                ptTypeId: typeId,
            },
            request: req,
            required: true,
        });
        return json.created({ message: 'PT task created successfully.', task: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
