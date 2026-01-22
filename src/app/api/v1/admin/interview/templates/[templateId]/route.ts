import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { interviewTemplateParam, interviewTemplateUpdateSchema } from '@/app/lib/interview-template-validators';
import { getInterviewTemplate, updateInterviewTemplate, deleteInterviewTemplate } from '@/app/db/queries/interviewTemplates';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
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

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { templateId } = interviewTemplateParam.parse(await params);
        const dto = interviewTemplateUpdateSchema.parse(await req.json());
        const row = await updateInterviewTemplate(templateId, {
            ...dto,
            ...(dto.code ? { code: dto.code.trim() } : {}),
            ...(dto.title ? { title: dto.title.trim() } : {}),
            ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
        });
        if (!row) throw new ApiError(404, 'Interview template not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INTERVIEW_TEMPLATE_UPDATED,
            resourceType: AuditResourceType.INTERVIEW_TEMPLATE,
            resourceId: row.id,
            description: `Updated interview template ${row.code}`,
            metadata: {
                templateId: row.id,
                changes: Object.keys(dto),
            },
            request: req,
            required: true,
        });
        return json.ok({ message: 'Interview template updated successfully.', template: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { templateId } = interviewTemplateParam.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteInterviewTemplate(templateId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Interview template not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INTERVIEW_TEMPLATE_DELETED,
            resourceType: AuditResourceType.INTERVIEW_TEMPLATE,
            resourceId: row.id,
            description: `${body?.hard ? 'Hard' : 'Soft'} deleted interview template ${row.code}`,
            metadata: {
                templateId: row.id,
                hardDeleted: body?.hard === true,
            },
            request: req,
        });
        return json.ok({ message: 'Interview template deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const PATCH = withRouteLogging('PATCH', PATCHHandler);
export const DELETE = withRouteLogging('DELETE', DELETEHandler);
