import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
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
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
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

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
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

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INTERVIEW_SECTION_CREATED,
            resourceType: AuditResourceType.INTERVIEW_SECTION,
            resourceId: row.id,
            description: `Created interview section ${row.title}`,
            metadata: {
                templateId,
                sectionId: row.id,
            },
            request: req,
            required: true,
        });
        return json.created({ message: 'Interview template section created successfully.', section: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
