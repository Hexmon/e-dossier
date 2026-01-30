import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { interviewSectionParam, interviewSectionUpdateSchema } from '@/app/lib/interview-template-validators';
import {
    getInterviewTemplateSection,
    updateInterviewTemplateSection,
    deleteInterviewTemplateSection,
} from '@/app/db/queries/interviewTemplates';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(
    req: NextRequest,
    { params }: { params: Promise<{ templateId: string; sectionId: string }> },
) {
    try {
        await requireAuth(req);
        const { templateId, sectionId } = interviewSectionParam.parse(await params);
        const row = await getInterviewTemplateSection(sectionId);
        if (!row || row.templateId !== templateId) throw new ApiError(404, 'Interview section not found', 'not_found');
        return json.ok({ message: 'Interview template section retrieved successfully.', section: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(
    req: NextRequest,
    { params }: { params: Promise<{ templateId: string; sectionId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId, sectionId } = interviewSectionParam.parse(await params);
        const existing = await getInterviewTemplateSection(sectionId);
        if (!existing || existing.templateId !== templateId) throw new ApiError(404, 'Interview section not found', 'not_found');

        const dto = interviewSectionUpdateSchema.parse(await req.json());
        const row = await updateInterviewTemplateSection(sectionId, {
            ...dto,
            ...(dto.title ? { title: dto.title.trim() } : {}),
            ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
        });
        if (!row) throw new ApiError(404, 'Interview section not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INTERVIEW_SECTION_UPDATED,
            resourceType: AuditResourceType.INTERVIEW_SECTION,
            resourceId: row.id,
            description: `Updated interview section ${row.title}`,
            metadata: {
                templateId,
                sectionId: row.id,
                changes: Object.keys(dto),
            },
            request: req,
            required: true,
        });
        return json.ok({ message: 'Interview template section updated successfully.', section: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(
    req: NextRequest,
    { params }: { params: Promise<{ templateId: string; sectionId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId, sectionId } = interviewSectionParam.parse(await params);
        const existing = await getInterviewTemplateSection(sectionId);
        if (!existing || existing.templateId !== templateId) throw new ApiError(404, 'Interview section not found', 'not_found');

        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteInterviewTemplateSection(sectionId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Interview section not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INTERVIEW_SECTION_DELETED,
            resourceType: AuditResourceType.INTERVIEW_SECTION,
            resourceId: row.id,
            description: `${body?.hard ? 'Hard' : 'Soft'} deleted interview section ${row.title}`,
            metadata: {
                templateId,
                sectionId: row.id,
                hardDeleted: body?.hard === true,
            },
            request: req,
        });
        return json.ok({ message: 'Interview template section deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const PATCH = withRouteLogging('PATCH', PATCHHandler);
export const DELETE = withRouteLogging('DELETE', DELETEHandler);
