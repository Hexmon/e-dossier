import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import {
    interviewTemplateParam,
    interviewTemplateSemesterCreateSchema,
} from '@/app/lib/interview-template-validators';
import {
    getInterviewTemplate,
    listInterviewTemplateSemesters,
    addInterviewTemplateSemester,
} from '@/app/db/queries/interviewTemplates';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
    try {
        await requireAuth(req);
        const { templateId } = interviewTemplateParam.parse(await params);
        const template = await getInterviewTemplate(templateId);
        if (!template) throw new ApiError(404, 'Interview template not found', 'not_found');

        const items = await listInterviewTemplateSemesters(templateId);
        return json.ok({ message: 'Interview template semesters retrieved successfully.', items, count: items.length });
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

        const dto = interviewTemplateSemesterCreateSchema.parse(await req.json());
        const row = await addInterviewTemplateSemester(templateId, dto.semester);

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INTERVIEW_TEMPLATE_SEMESTER_ADDED,
            resourceType: AuditResourceType.INTERVIEW_TEMPLATE,
            resourceId: templateId,
            description: `Added semester ${dto.semester} to interview template ${template.code}`,
            metadata: {
                templateId,
                semester: dto.semester,
            },
            request: req,
            required: true,
        });
        return json.created({ message: 'Interview template semester added successfully.', semester: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
