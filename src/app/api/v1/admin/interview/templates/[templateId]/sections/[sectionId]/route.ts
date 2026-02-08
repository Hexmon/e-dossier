import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { interviewSectionParam, interviewSectionUpdateSchema } from '@/app/lib/interview-template-validators';
import {
    getInterviewTemplateSection,
    updateInterviewTemplateSection,
    deleteInterviewTemplateSection,
} from '@/app/db/queries/interviewTemplates';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(
    req: AuditNextRequest,
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
    req: AuditNextRequest,
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

        await req.audit.log({
            action: AuditEventType.INTERVIEW_SECTION_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_SECTION, id: row.id },
            metadata: {
                description: `Updated interview section ${row.title}`,
                templateId,
                sectionId: row.id,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'Interview template section updated successfully.', section: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(
    req: AuditNextRequest,
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

        await req.audit.log({
            action: AuditEventType.INTERVIEW_SECTION_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_SECTION, id: row.id },
            metadata: {
                description: `${body?.hard ? 'Hard' : 'Soft'} deleted interview section ${row.title}`,
                templateId,
                sectionId: row.id,
                hardDeleted: body?.hard === true,
            },
        });
        return json.ok({ message: 'Interview template section deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
