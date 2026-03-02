import { z } from 'zod';
import { requireAdmin } from '@/app/lib/authz';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { olqTemplateCopySchema } from '@/app/lib/olq-validators';
import { copyOlqTemplateToCourse } from '@/app/db/queries/olq';
import {
    AuditEventType,
    AuditResourceType,
    type AuditNextRequest,
    withAuditRoute,
} from '@/lib/audit';

export const runtime = 'nodejs';

const TargetCourseParam = z.object({ courseId: z.string().uuid() });

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ courseId: string }> }) {
    try {
        const auth = await requireAdmin(req);
        const { courseId: targetCourseId } = TargetCourseParam.parse(await params);
        const dto = olqTemplateCopySchema.parse(await req.json());

        if (dto.sourceCourseId === targetCourseId) {
            throw new ApiError(400, 'sourceCourseId and targetCourseId cannot be the same', 'bad_request');
        }

        const result = await copyOlqTemplateToCourse({
            sourceCourseId: dto.sourceCourseId,
            targetCourseId,
            mode: dto.mode,
        });

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: auth.userId },
            target: { type: AuditResourceType.COURSE, id: targetCourseId },
            metadata: {
                description: `Admin copied OLQ template from course ${dto.sourceCourseId} to ${targetCourseId}`,
                module: 'admin_olq_templates',
                sourceCourseId: dto.sourceCourseId,
                targetCourseId,
                mode: dto.mode,
                categoriesCopied: result.categoriesCopied,
                subtitlesCopied: result.subtitlesCopied,
            },
        });

        return json.ok({
            message: 'OLQ template copied successfully.',
            ...result,
        });
    } catch (error: any) {
        const pgCode = error?.code ?? error?.cause?.code;
        if (pgCode === '23505') {
            return json.conflict('Template copy conflict for target course.');
        }
        return handleApiError(error);
    }
}

export const POST = withAuditRoute('POST', POSTHandler);
