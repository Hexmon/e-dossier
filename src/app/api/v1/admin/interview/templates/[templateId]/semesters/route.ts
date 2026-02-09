import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import {
    interviewTemplateParam,
    interviewTemplateSemesterCreateSchema,
} from '@/app/lib/interview-template-validators';
import {
    getInterviewTemplate,
    listInterviewTemplateSemesters,
    addInterviewTemplateSemester,
} from '@/app/db/queries/interviewTemplates';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ templateId: string }> }) {
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

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ templateId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId } = interviewTemplateParam.parse(await params);
        const template = await getInterviewTemplate(templateId);
        if (!template) throw new ApiError(404, 'Interview template not found', 'not_found');

        const dto = interviewTemplateSemesterCreateSchema.parse(await req.json());
        const row = await addInterviewTemplateSemester(templateId, dto.semester);

        await req.audit.log({
            action: AuditEventType.INTERVIEW_TEMPLATE_SEMESTER_ADDED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_TEMPLATE, id: templateId },
            metadata: {
                description: `Added semester ${dto.semester} to interview template ${template.code}`,
                templateId,
                semester: dto.semester,
            },
        });
        return json.created({ message: 'Interview template semester added successfully.', semester: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
