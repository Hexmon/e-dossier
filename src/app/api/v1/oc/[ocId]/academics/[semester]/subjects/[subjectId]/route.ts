import { json, handleApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists, mustBePlatoonCommander } from '../../../../../_checks';
import { OcIdParam, SemesterParam, SubjectIdParam, academicSubjectPatchSchema } from '@/app/lib/oc-validators';
import { updateOcAcademicSubject, deleteOcAcademicSubject } from '@/app/services/oc-academics';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function PATCHHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ ocId: string; semester: string; subjectId: string }> },
) {
    try {
        const authCtx = await mustBePlatoonCommander(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        const { semester } = await parseParam({ params }, SemesterParam);
        const { subjectId } = await parseParam({ params }, SubjectIdParam);
        await ensureOcExists(ocId);
        const dto = academicSubjectPatchSchema.parse(await req.json());
        const data = await updateOcAcademicSubject(ocId, semester, subjectId, {
            theory: dto.theory,
            practical: dto.practical,
        }, {
            actorUserId: authCtx?.userId,
            actorRoles: authCtx?.roles,
            request: req,
        });

        await req.audit.log({
            action: AuditEventType.OC_ACADEMICS_SUBJECT_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC_ACADEMICS, id: ocId },
            metadata: {
                description: `Academic subject ${subjectId} updated for OC ${ocId}, semester ${semester}`,
                ocId,
                semester,
                subjectId,
                changes: Object.keys(dto),
            },
        });

        return json.ok({
            message: 'Academic subject updated successfully.',
            data,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ ocId: string; semester: string; subjectId: string }> },
) {
    try {
        const authCtx = await mustBePlatoonCommander(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        const { semester } = await parseParam({ params }, SemesterParam);
        const { subjectId } = await parseParam({ params }, SubjectIdParam);
        await ensureOcExists(ocId);
        const hard = new URL(req.url).searchParams.get('hard') === 'true';
        const data = await deleteOcAcademicSubject(ocId, semester, subjectId, { hard }, {
            actorUserId: authCtx?.userId,
            actorRoles: authCtx?.roles,
            request: req,
        });

        await req.audit.log({
            action: AuditEventType.OC_ACADEMICS_SUBJECT_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC_ACADEMICS, id: ocId },
            metadata: {
                description: `Academic subject ${subjectId} deleted for OC ${ocId}, semester ${semester}`,
                ocId,
                semester,
                subjectId,
                hardDeleted: hard,
            },
        });

        return json.ok({
            message: hard ? 'Academic subject hard-deleted.' : 'Academic subject soft-deleted.',
            data,
        });
    } catch (err) {
        return handleApiError(err);
    }
}
export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
