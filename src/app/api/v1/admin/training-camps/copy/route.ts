import { requireAdmin } from '@/app/lib/authz';
import { copyTrainingCampTemplateSemester } from '@/app/db/queries/trainingCamps';
import { handleApiError, json, ApiError } from '@/app/lib/http';
import { trainingCampCopySchema } from '@/app/lib/training-camp-validators';
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
        const dto = trainingCampCopySchema.parse(await req.json());

        if (dto.sourceCourseId === dto.targetCourseId) {
            throw new ApiError(400, 'sourceCourseId and targetCourseId cannot be the same', 'bad_request');
        }

        const result = await copyTrainingCampTemplateSemester(dto);

        await req.audit.log({
            action: AuditEventType.TRAINING_CAMP_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: auth.userId },
            target: { type: AuditResourceType.TRAINING_CAMP, id: `course:${dto.targetCourseId}:semester:${dto.semester}` },
            metadata: {
                description: `Copied camp template from course ${dto.sourceCourseId} to course ${dto.targetCourseId} for semester ${dto.semester}`,
                module: 'admin_training_camp_templates',
                ...result,
            },
        });

        return json.ok({
            message: 'Training camp template copied successfully.',
            ...result,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export const POST = withAuditRoute('POST', POSTHandler);