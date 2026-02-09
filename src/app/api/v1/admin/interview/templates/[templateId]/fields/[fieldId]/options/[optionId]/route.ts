import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { interviewFieldOptionParam, interviewFieldOptionUpdateSchema } from '@/app/lib/interview-template-validators';
import {
    getInterviewTemplateField,
    getInterviewTemplateFieldOption,
    updateInterviewTemplateFieldOption,
    deleteInterviewTemplateFieldOption,
} from '@/app/db/queries/interviewTemplates';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ templateId: string; fieldId: string; optionId: string }> },
) {
    try {
        await requireAuth(req);
        const { templateId, fieldId, optionId } = interviewFieldOptionParam.parse(await params);
        const field = await getInterviewTemplateField(fieldId);
        if (!field || field.templateId !== templateId) throw new ApiError(404, 'Interview field not found', 'not_found');

        const row = await getInterviewTemplateFieldOption(optionId);
        if (!row || row.fieldId !== fieldId) throw new ApiError(404, 'Interview field option not found', 'not_found');
        return json.ok({ message: 'Interview field option retrieved successfully.', option: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ templateId: string; fieldId: string; optionId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId, fieldId, optionId } = interviewFieldOptionParam.parse(await params);
        const field = await getInterviewTemplateField(fieldId);
        if (!field || field.templateId !== templateId) throw new ApiError(404, 'Interview field not found', 'not_found');

        const existing = await getInterviewTemplateFieldOption(optionId);
        if (!existing || existing.fieldId !== fieldId) throw new ApiError(404, 'Interview field option not found', 'not_found');

        const dto = interviewFieldOptionUpdateSchema.parse(await req.json());
        const row = await updateInterviewTemplateFieldOption(optionId, {
            ...dto,
            ...(dto.code ? { code: dto.code.trim() } : {}),
            ...(dto.label ? { label: dto.label.trim() } : {}),
        });
        if (!row) throw new ApiError(404, 'Interview field option not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.INTERVIEW_FIELD_OPTION_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_FIELD_OPTION, id: row.id },
            metadata: {
                description: `Updated interview field option ${row.code}`,
                templateId,
                fieldId,
                optionId: row.id,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'Interview field option updated successfully.', option: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ templateId: string; fieldId: string; optionId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId, fieldId, optionId } = interviewFieldOptionParam.parse(await params);
        const field = await getInterviewTemplateField(fieldId);
        if (!field || field.templateId !== templateId) throw new ApiError(404, 'Interview field not found', 'not_found');

        const existing = await getInterviewTemplateFieldOption(optionId);
        if (!existing || existing.fieldId !== fieldId) throw new ApiError(404, 'Interview field option not found', 'not_found');

        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteInterviewTemplateFieldOption(optionId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Interview field option not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.INTERVIEW_FIELD_OPTION_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_FIELD_OPTION, id: row.id },
            metadata: {
                description: `${body?.hard ? 'Hard' : 'Soft'} deleted interview field option ${row.code}`,
                templateId,
                fieldId,
                optionId: row.id,
                hardDeleted: body?.hard === true,
            },
        });
        return json.ok({ message: 'Interview field option deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
