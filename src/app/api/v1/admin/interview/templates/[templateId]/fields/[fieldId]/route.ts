import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { interviewFieldParam, interviewFieldUpdateSchema } from '@/app/lib/interview-template-validators';
import { getInterviewTemplateField, updateInterviewTemplateField, deleteInterviewTemplateField } from '@/app/db/queries/interviewTemplates';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(
    req: NextRequest,
    { params }: { params: Promise<{ templateId: string; fieldId: string }> },
) {
    try {
        await requireAuth(req);
        const { templateId, fieldId } = interviewFieldParam.parse(await params);
        const row = await getInterviewTemplateField(fieldId);
        if (!row || row.templateId !== templateId) throw new ApiError(404, 'Interview field not found', 'not_found');
        return json.ok({ message: 'Interview template field retrieved successfully.', field: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(
    req: NextRequest,
    { params }: { params: Promise<{ templateId: string; fieldId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId, fieldId } = interviewFieldParam.parse(await params);
        const existing = await getInterviewTemplateField(fieldId);
        if (!existing || existing.templateId !== templateId) throw new ApiError(404, 'Interview field not found', 'not_found');

        const dto = interviewFieldUpdateSchema.parse(await req.json());
        const row = await updateInterviewTemplateField(fieldId, {
            ...dto,
            ...(dto.key ? { key: dto.key.trim() } : {}),
            ...(dto.label ? { label: dto.label.trim() } : {}),
            ...(dto.helpText !== undefined ? { helpText: dto.helpText ?? null } : {}),
            ...(dto.maxLength !== undefined ? { maxLength: dto.maxLength ?? null } : {}),
        });
        if (!row) throw new ApiError(404, 'Interview field not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INTERVIEW_FIELD_UPDATED,
            resourceType: AuditResourceType.INTERVIEW_FIELD,
            resourceId: row.id,
            description: `Updated interview field ${row.key}`,
            metadata: {
                templateId,
                fieldId: row.id,
                changes: Object.keys(dto),
            },
            request: req,
            required: true,
        });
        return json.ok({ message: 'Interview template field updated successfully.', field: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(
    req: NextRequest,
    { params }: { params: Promise<{ templateId: string; fieldId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId, fieldId } = interviewFieldParam.parse(await params);
        const existing = await getInterviewTemplateField(fieldId);
        if (!existing || existing.templateId !== templateId) throw new ApiError(404, 'Interview field not found', 'not_found');

        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteInterviewTemplateField(fieldId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Interview field not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INTERVIEW_FIELD_DELETED,
            resourceType: AuditResourceType.INTERVIEW_FIELD,
            resourceId: row.id,
            description: `${body?.hard ? 'Hard' : 'Soft'} deleted interview field ${row.key}`,
            metadata: {
                templateId,
                fieldId: row.id,
                hardDeleted: body?.hard === true,
            },
            request: req,
        });
        return json.ok({ message: 'Interview template field deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const PATCH = withRouteLogging('PATCH', PATCHHandler);
export const DELETE = withRouteLogging('DELETE', DELETEHandler);
