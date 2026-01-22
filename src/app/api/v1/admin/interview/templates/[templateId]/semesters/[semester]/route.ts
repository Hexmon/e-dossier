import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { interviewTemplateSemesterParam } from '@/app/lib/interview-template-validators';
import { getInterviewTemplate, removeInterviewTemplateSemester } from '@/app/db/queries/interviewTemplates';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function DELETEHandler(
    req: NextRequest,
    { params }: { params: Promise<{ templateId: string; semester: string }> },
) {
    try {
        const adminCtx = await requireAdmin(req);
        const { templateId, semester } = interviewTemplateSemesterParam.parse(await params);
        const template = await getInterviewTemplate(templateId);
        if (!template) throw new ApiError(404, 'Interview template not found', 'not_found');

        const row = await removeInterviewTemplateSemester(templateId, semester);
        if (!row) throw new ApiError(404, 'Template semester not found', 'not_found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INTERVIEW_TEMPLATE_SEMESTER_REMOVED,
            resourceType: AuditResourceType.INTERVIEW_TEMPLATE,
            resourceId: templateId,
            description: `Removed semester ${semester} from interview template ${template.code}`,
            metadata: {
                templateId,
                semester,
            },
            request: req,
        });
        return json.ok({ message: 'Interview template semester removed successfully.', deleted: row.id });
    } catch (err) {
        return handleApiError(err);
    }
}

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
