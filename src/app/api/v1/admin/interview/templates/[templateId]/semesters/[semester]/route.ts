import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { interviewTemplateSemesterParam } from '@/app/lib/interview-template-validators';
import { getInterviewTemplate, removeInterviewTemplateSemester } from '@/app/db/queries/interviewTemplates';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function DELETEHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ templateId: string; semester: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId, semester } = interviewTemplateSemesterParam.parse(await params);
        const template = await getInterviewTemplate(templateId);
        if (!template) throw new ApiError(404, 'Interview template not found', 'not_found');

        const row = await removeInterviewTemplateSemester(templateId, semester);
        if (!row) throw new ApiError(404, 'Template semester not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.INTERVIEW_TEMPLATE_SEMESTER_REMOVED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_TEMPLATE, id: templateId },
            metadata: {
                description: `Removed semester ${semester} from interview template ${template.code}`,
                templateId,
                semester,
            },
        });
        return json.ok({ message: 'Interview template semester removed successfully.', deleted: row.id });
    } catch (err) {
        return handleApiError(err);
    }
}

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
