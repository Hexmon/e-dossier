import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { interviewFieldParam, interviewFieldUpdateSchema } from '@/app/lib/interview-template-validators';
import { getInterviewTemplateField, updateInterviewTemplateField, deleteInterviewTemplateField } from '@/app/db/queries/interviewTemplates';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(
    req: AuditNextRequest,
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
    req: AuditNextRequest,
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

        await req.audit.log({
            action: AuditEventType.INTERVIEW_FIELD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_FIELD, id: row.id },
            metadata: {
                description: `Updated interview field ${row.key}`,
                templateId,
                fieldId: row.id,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'Interview template field updated successfully.', field: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(
    req: AuditNextRequest,
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

        await req.audit.log({
            action: AuditEventType.INTERVIEW_FIELD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_FIELD, id: row.id },
            metadata: {
                description: `${body?.hard ? 'Hard' : 'Soft'} deleted interview field ${row.key}`,
                templateId,
                fieldId: row.id,
                hardDeleted: body?.hard === true,
            },
        });
        return json.ok({ message: 'Interview template field deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
