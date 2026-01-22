import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { interviewFieldOptionParam, interviewFieldOptionUpdateSchema } from '@/app/lib/interview-template-validators';
import {
    getInterviewTemplateField,
    getInterviewTemplateFieldOption,
    updateInterviewTemplateFieldOption,
    deleteInterviewTemplateFieldOption,
} from '@/app/db/queries/interviewTemplates';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(
    req: NextRequest,
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
    req: NextRequest,
    { params }: { params: Promise<{ templateId: string; fieldId: string; optionId: string }> },
) {
    try {
        const adminCtx = await requireAdmin(req);
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

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INTERVIEW_FIELD_OPTION_UPDATED,
            resourceType: AuditResourceType.INTERVIEW_FIELD_OPTION,
            resourceId: row.id,
            description: `Updated interview field option ${row.code}`,
            metadata: {
                templateId,
                fieldId,
                optionId: row.id,
                changes: Object.keys(dto),
            },
            request: req,
            required: true,
        });
        return json.ok({ message: 'Interview field option updated successfully.', option: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(
    req: NextRequest,
    { params }: { params: Promise<{ templateId: string; fieldId: string; optionId: string }> },
) {
    try {
        const adminCtx = await requireAdmin(req);
        const { templateId, fieldId, optionId } = interviewFieldOptionParam.parse(await params);
        const field = await getInterviewTemplateField(fieldId);
        if (!field || field.templateId !== templateId) throw new ApiError(404, 'Interview field not found', 'not_found');

        const existing = await getInterviewTemplateFieldOption(optionId);
        if (!existing || existing.fieldId !== fieldId) throw new ApiError(404, 'Interview field option not found', 'not_found');

        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteInterviewTemplateFieldOption(optionId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Interview field option not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INTERVIEW_FIELD_OPTION_DELETED,
            resourceType: AuditResourceType.INTERVIEW_FIELD_OPTION,
            resourceId: row.id,
            description: `${body?.hard ? 'Hard' : 'Soft'} deleted interview field option ${row.code}`,
            metadata: {
                templateId,
                fieldId,
                optionId: row.id,
                hardDeleted: body?.hard === true,
            },
            request: req,
        });
        return json.ok({ message: 'Interview field option deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const PATCH = withRouteLogging('PATCH', PATCHHandler);
export const DELETE = withRouteLogging('DELETE', DELETEHandler);
