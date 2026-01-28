import { NextRequest } from 'next/server';
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
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

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

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const sp = new URL(req.url).searchParams;
        const qp = ptOcMotivationQuerySchema.parse({
            semester: sp.get('semester') ?? undefined,
        });

        const items = await listOcPtMotivationValues(ocId, qp.semester);
        return json.ok({ message: 'PT motivation awards retrieved successfully.', data: { semester: qp.semester, values: items } });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const dto = ptOcMotivationUpsertSchema.parse(await req.json());
        const fieldIds = dto.values.map((v) => v.fieldId);
        await validateMotivationFields(dto.semester, fieldIds);

        await upsertOcPtMotivationValues(ocId, dto.semester, dto.values);
        const items = await listOcPtMotivationValues(ocId, dto.semester);

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_CREATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Created PT motivation awards for OC ${ocId} semester ${dto.semester}`,
            metadata: {
                ocId,
                module: 'physical_training_motivation',
                semester: dto.semester,
                valueCount: dto.values.length,
            },
            request: req,
        });
        return json.created({ message: 'PT motivation awards saved successfully.', data: { semester: dto.semester, values: items } });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
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

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_UPDATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Updated PT motivation awards for OC ${ocId} semester ${dto.semester}`,
            metadata: {
                ocId,
                module: 'physical_training_motivation',
                semester: dto.semester,
                valueUpdates: dto.values?.length ?? 0,
                deletedFields: dto.deleteFieldIds?.length ?? 0,
                changes: Object.keys(dto),
            },
            request: req,
        });
        return json.ok({ message: 'PT motivation awards updated successfully.', data: { semester: dto.semester, values: items } });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const dto = ptOcMotivationDeleteSchema.parse(await req.json());

        const deleted = dto.fieldIds?.length
            ? await deleteOcPtMotivationValuesByIds(ocId, dto.fieldIds)
            : await deleteOcPtMotivationValuesBySemester(ocId, dto.semester);

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_DELETED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Deleted PT motivation awards for OC ${ocId} semester ${dto.semester}`,
            metadata: {
                ocId,
                module: 'physical_training_motivation',
                semester: dto.semester,
                deletedCount: deleted.length,
                hardDeleted: true,
            },
            request: req,
        });
        return json.ok({ message: 'PT motivation awards deleted successfully.', deleted: deleted.map((row) => row.id) });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
export const PATCH = withRouteLogging('PATCH', PATCHHandler);
export const DELETE = withRouteLogging('DELETE', DELETEHandler);
