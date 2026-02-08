import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { interviewGroupParam, interviewGroupUpdateSchema } from '@/app/lib/interview-template-validators';
import {
    getInterviewTemplateSection,
    getInterviewTemplateGroup,
    updateInterviewTemplateGroup,
    deleteInterviewTemplateGroup,
} from '@/app/db/queries/interviewTemplates';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ templateId: string; groupId: string }> },
) {
    try {
        await requireAuth(req);
        const { templateId, groupId } = interviewGroupParam.parse(await params);
        const row = await getInterviewTemplateGroup(groupId);
        if (!row || row.templateId !== templateId) throw new ApiError(404, 'Interview group not found', 'not_found');
        return json.ok({ message: 'Interview template group retrieved successfully.', group: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ templateId: string; groupId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId, groupId } = interviewGroupParam.parse(await params);
        const existing = await getInterviewTemplateGroup(groupId);
        if (!existing || existing.templateId !== templateId) throw new ApiError(404, 'Interview group not found', 'not_found');

        const dto = interviewGroupUpdateSchema.parse(await req.json());
        const sectionId = dto.sectionId ?? undefined;
        if (sectionId) {
            const section = await getInterviewTemplateSection(sectionId);
            if (!section || section.templateId !== templateId) {
                throw new ApiError(404, 'Interview section not found', 'not_found');
            }
        }

        const row = await updateInterviewTemplateGroup(groupId, {
            ...dto,
            ...(dto.title ? { title: dto.title.trim() } : {}),
            ...(dto.sectionId !== undefined ? { sectionId: sectionId ?? null } : {}),
            ...(dto.maxRows !== undefined ? { maxRows: dto.maxRows ?? null } : {}),
        });
        if (!row) throw new ApiError(404, 'Interview group not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.INTERVIEW_GROUP_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_GROUP, id: row.id },
            metadata: {
                description: `Updated interview group ${row.title}`,
                templateId,
                groupId: row.id,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'Interview template group updated successfully.', group: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ templateId: string; groupId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId, groupId } = interviewGroupParam.parse(await params);
        const existing = await getInterviewTemplateGroup(groupId);
        if (!existing || existing.templateId !== templateId) throw new ApiError(404, 'Interview group not found', 'not_found');

        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteInterviewTemplateGroup(groupId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Interview group not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.INTERVIEW_GROUP_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_GROUP, id: row.id },
            metadata: {
                description: `${body?.hard ? 'Hard' : 'Soft'} deleted interview group ${row.title}`,
                templateId,
                groupId: row.id,
                hardDeleted: body?.hard === true,
            },
        });
        return json.ok({ message: 'Interview template group deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
