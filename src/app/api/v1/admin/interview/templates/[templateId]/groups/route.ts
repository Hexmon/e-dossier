import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import {
    interviewTemplateParam,
    interviewGroupCreateSchema,
    interviewGroupQuerySchema,
} from '@/app/lib/interview-template-validators';
import {
    getInterviewTemplate,
    getInterviewTemplateSection,
    listInterviewTemplateGroups,
    createInterviewTemplateGroup,
} from '@/app/db/queries/interviewTemplates';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ templateId: string }> }) {
    try {
        await requireAuth(req);
        const { templateId } = interviewTemplateParam.parse(await params);
        const template = await getInterviewTemplate(templateId);
        if (!template) throw new ApiError(404, 'Interview template not found', 'not_found');

        const sp = new URL(req.url).searchParams;
        const qp = interviewGroupQuerySchema.parse({
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });
        const items = await listInterviewTemplateGroups(templateId, { includeDeleted: qp.includeDeleted ?? false });
        return json.ok({ message: 'Interview template groups retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ templateId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId } = interviewTemplateParam.parse(await params);
        const template = await getInterviewTemplate(templateId);
        if (!template) throw new ApiError(404, 'Interview template not found', 'not_found');

        const dto = interviewGroupCreateSchema.parse(await req.json());
        const sectionId = dto.sectionId ?? undefined;
        if (sectionId) {
            const section = await getInterviewTemplateSection(sectionId);
            if (!section || section.templateId !== templateId) {
                throw new ApiError(404, 'Interview section not found', 'not_found');
            }
        }

        const row = await createInterviewTemplateGroup(templateId, {
            sectionId: sectionId ?? null,
            title: dto.title.trim(),
            minRows: dto.minRows ?? 0,
            maxRows: dto.maxRows ?? null,
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await req.audit.log({
            action: AuditEventType.INTERVIEW_GROUP_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_GROUP, id: row.id },
            metadata: {
                description: `Created interview group ${row.title}`,
                templateId,
                groupId: row.id,
                sectionId: row.sectionId,
            },
        });
        return json.created({ message: 'Interview template group created successfully.', group: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
