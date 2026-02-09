import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ptTaskCreateSchema, ptTaskQuerySchema, ptTypeParam } from '@/app/lib/physical-training-validators';
import { getPtType, listPtTasks, createPtTask } from '@/app/db/queries/physicalTraining';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string }> }) {
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

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ typeId: string }> }) {
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

        await req.audit.log({
            action: AuditEventType.PT_TASK_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PT_TASK, id: row.id },
            metadata: {
                description: `Created PT task ${row.title} for type ${type.code}`,
                ptTaskId: row.id,
                ptTypeId: typeId,
            },
        });
        return json.created({ message: 'PT task created successfully.', task: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
