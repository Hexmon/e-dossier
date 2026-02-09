import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { interviewTemplateParam, interviewTemplateUpdateSchema } from '@/app/lib/interview-template-validators';
import { getInterviewTemplate, updateInterviewTemplate, deleteInterviewTemplate } from '@/app/db/queries/interviewTemplates';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ templateId: string }> }) {
    try {
        await requireAuth(req);
        const { templateId } = interviewTemplateParam.parse(await params);
        const row = await getInterviewTemplate(templateId);
        if (!row) throw new ApiError(404, 'Interview template not found', 'not_found');
        return json.ok({ message: 'Interview template retrieved successfully.', template: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ templateId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId } = interviewTemplateParam.parse(await params);
        const dto = interviewTemplateUpdateSchema.parse(await req.json());
        const row = await updateInterviewTemplate(templateId, {
            ...dto,
            ...(dto.code ? { code: dto.code.trim() } : {}),
            ...(dto.title ? { title: dto.title.trim() } : {}),
            ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
        });
        if (!row) throw new ApiError(404, 'Interview template not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.INTERVIEW_TEMPLATE_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_TEMPLATE, id: row.id },
            metadata: {
                description: `Updated interview template ${row.code}`,
                templateId: row.id,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'Interview template updated successfully.', template: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ templateId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId } = interviewTemplateParam.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteInterviewTemplate(templateId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Interview template not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.INTERVIEW_TEMPLATE_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_TEMPLATE, id: row.id },
            metadata: {
                description: `${body?.hard ? 'Hard' : 'Soft'} deleted interview template ${row.code}`,
                templateId: row.id,
                hardDeleted: body?.hard === true,
            },
        });
        return json.ok({ message: 'Interview template deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
