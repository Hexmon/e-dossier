import { requireAdmin } from '@/app/lib/authz';
import { copyInterviewTemplatesToCourse } from '@/app/db/queries/interviewTemplates';
import { handleApiError, json } from '@/app/lib/http';
import { interviewTemplateCopySchema } from '@/app/lib/interview-template-validators';
import {
    AuditEventType,
    AuditResourceType,
    type AuditNextRequest,
    withAuditRoute,
} from '@/lib/audit';

export const runtime = 'nodejs';

async function POSTHandler(req: AuditNextRequest) {
    try {
        const auth = await requireAdmin(req);
        const dto = interviewTemplateCopySchema.parse(await req.json());
        const result = await copyInterviewTemplatesToCourse(dto);

        await req.audit.log({
            action: AuditEventType.INTERVIEW_TEMPLATE_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: auth.userId },
            target: { type: AuditResourceType.INTERVIEW_TEMPLATE, id: `course:${result.targetCourseId}` },
            metadata: {
                description: `Copied interview templates from course ${dto.sourceCourseId} to course ${dto.targetCourseId}`,
                module: 'admin_interview_templates',
                ...result,
            },
        });

        return json.ok({
            message: 'Interview templates copied successfully.',
            ...result,
        });
    } catch (error: any) {
        const pgCode = error?.code ?? error?.cause?.code;
        if (pgCode === '23505') {
            return json.conflict('Interview template copy conflict.');
        }
        return handleApiError(error);
    }
}

export const POST = withAuditRoute('POST', POSTHandler);
