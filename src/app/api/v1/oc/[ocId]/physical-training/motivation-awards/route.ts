import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import {
    ptOcMotivationQuerySchema,
    ptOcMotivationUpsertSchema,
    ptOcMotivationUpdateSchema,
    ptOcMotivationDeleteSchema,
} from '@/app/lib/physical-training-oc-validators';
import {
    listMotivationFieldsByIds,
    listOcPtMotivationValues,
    upsertOcPtMotivationValues,
    deleteOcPtMotivationValuesByIds,
    deleteOcPtMotivationValuesBySemester,
} from '@/app/db/queries/physicalTrainingOc';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function validateMotivationFields(semester: number, fieldIds: string[]) {
    const uniqueIds = Array.from(new Set(fieldIds));
    const fields = await listMotivationFieldsByIds(uniqueIds);
    const fieldById = new Map(fields.map((f) => [f.id, f]));

    const invalidIds: string[] = [];
    for (const id of uniqueIds) {
        const field = fieldById.get(id);
        if (!field) {
            invalidIds.push(id);
            continue;
        }
        if (field.semester !== semester) {
            invalidIds.push(id);
            continue;
        }
        if (field.deletedAt || !field.isActive) {
            invalidIds.push(id);
        }
    }

    if (invalidIds.length) {
        throw new ApiError(400, 'Invalid PT motivation fields', 'invalid_field', { invalidIds });
    }
}

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const sp = new URL(req.url).searchParams;
        const qp = ptOcMotivationQuerySchema.parse({
            semester: sp.get('semester') ?? undefined,
        });

        const items = await listOcPtMotivationValues(ocId, qp.semester);

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `PT motivation awards retrieved for OC ${ocId}`,
                module: 'physical_training_motivation',
                ocId,
                semester: qp.semester ?? null,
                valueCount: items.length,
            },
        });

        return json.ok({ message: 'PT motivation awards retrieved successfully.', data: { semester: qp.semester, values: items } });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const dto = ptOcMotivationUpsertSchema.parse(await req.json());
        const fieldIds = dto.values.map((v) => v.fieldId);
        await validateMotivationFields(dto.semester, fieldIds);

        await upsertOcPtMotivationValues(ocId, dto.semester, dto.values);
        const items = await listOcPtMotivationValues(ocId, dto.semester);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Created PT motivation awards for OC ${ocId} semester ${dto.semester}`,
                ocId,
                module: 'physical_training_motivation',
                semester: dto.semester,
                valueCount: dto.values.length,
            },
        });
        return json.created({ message: 'PT motivation awards saved successfully.', data: { semester: dto.semester, values: items } });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const dto = ptOcMotivationUpdateSchema.parse(await req.json());

        if (dto.values?.length) {
            await validateMotivationFields(dto.semester, dto.values.map((v) => v.fieldId));
            await upsertOcPtMotivationValues(ocId, dto.semester, dto.values);
        }

        if (dto.deleteFieldIds?.length) {
            await deleteOcPtMotivationValuesByIds(ocId, dto.deleteFieldIds);
        }

        const items = await listOcPtMotivationValues(ocId, dto.semester);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Updated PT motivation awards for OC ${ocId} semester ${dto.semester}`,
                ocId,
                module: 'physical_training_motivation',
                semester: dto.semester,
                valueUpdates: dto.values?.length ?? 0,
                deletedFields: dto.deleteFieldIds?.length ?? 0,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'PT motivation awards updated successfully.', data: { semester: dto.semester, values: items } });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const dto = ptOcMotivationDeleteSchema.parse(await req.json());

        const deleted = dto.fieldIds?.length
            ? await deleteOcPtMotivationValuesByIds(ocId, dto.fieldIds)
            : await deleteOcPtMotivationValuesBySemester(ocId, dto.semester);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Deleted PT motivation awards for OC ${ocId} semester ${dto.semester}`,
                ocId,
                module: 'physical_training_motivation',
                semester: dto.semester,
                deletedCount: deleted.length,
                hardDeleted: true,
            },
        });
        return json.ok({ message: 'PT motivation awards deleted successfully.', deleted: deleted.map((row) => row.id) });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
