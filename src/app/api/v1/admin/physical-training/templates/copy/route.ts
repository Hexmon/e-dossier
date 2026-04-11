import { requireAdmin } from '@/app/lib/authz';
import { copyPtTemplateToCourse } from '@/app/db/queries/physicalTraining';
import { handleApiError, json, ApiError } from '@/app/lib/http';
import { ptTemplateCopySchema } from '@/app/lib/physical-training-validators';
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
        const dto = ptTemplateCopySchema.parse(await req.json());

        if (dto.sourceCourseId === dto.targetCourseId) {
            throw new ApiError(400, 'sourceCourseId and targetCourseId cannot be the same', 'bad_request');
        }

        const result = await copyPtTemplateToCourse(dto);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: auth.userId },
            target: { type: AuditResourceType.PT_TYPE, id: `course:${dto.targetCourseId}:semester:${dto.semester}` },
            metadata: {
                description: `Copied PT template from course ${dto.sourceCourseId} to course ${dto.targetCourseId} for semester ${dto.semester}`,
                module: 'admin_pt_templates',
                ...result,
            },
        });

        return json.ok({
            message: 'PT template copied successfully.',
            ...result,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export const POST = withAuditRoute('POST', POSTHandler);