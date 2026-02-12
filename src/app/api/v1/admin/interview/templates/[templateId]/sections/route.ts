import { json, handleApiError, ApiError } from '@/app/lib/http';

export const runtime = 'nodejs';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAuth } from '@/app/lib/authz';
import {
    interviewTemplateParam,
    interviewSectionCreateSchema,
    interviewSectionQuerySchema,
} from '@/app/lib/interview-template-validators';
import {
    getInterviewTemplate,
    listInterviewTemplateSections,
    createInterviewTemplateSection,
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
        const qp = interviewSectionQuerySchema.parse({
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });
        const items = await listInterviewTemplateSections(templateId, { includeDeleted: qp.includeDeleted ?? false });
        return json.ok({ message: 'Interview template sections retrieved successfully.', items, count: items.length });
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

        const dto = interviewSectionCreateSchema.parse(await req.json());
        const row = await createInterviewTemplateSection(templateId, {
            title: dto.title.trim(),
            description: dto.description ?? null,
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await req.audit.log({
            action: AuditEventType.INTERVIEW_SECTION_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_SECTION, id: row.id },
            metadata: {
                description: `Created interview section ${row.title}`,
                templateId,
                sectionId: row.id,
            },
        });
        return json.created({ message: 'Interview template section created successfully.', section: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
