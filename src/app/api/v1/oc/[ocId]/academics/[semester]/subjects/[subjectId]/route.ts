import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists, mustBeAuthed } from '../../../../../_checks';
import { OcIdParam, SemesterParam, SubjectIdParam, academicSubjectPatchSchema } from '@/app/lib/oc-validators';
import { updateOcAcademicSubject, deleteOcAcademicSubject } from '@/app/services/oc-academics';
import { withRouteLogging } from '@/lib/withRouteLogging';

// NOTE: Subject mutations trigger createAuditLog via services/oc-academics helpers.

async function PATCHHandler(
    req: NextRequest,
    { params }: { params: Promise<{ ocId: string; semester: string; subjectId: string }> },
) {
    try {
        const authCtx = await mustBeAuthed(req);
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
        return json.ok({
            message: 'Academic subject updated successfully.',
            data,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(
    req: NextRequest,
    { params }: { params: Promise<{ ocId: string; semester: string; subjectId: string }> },
) {
    try {
        const authCtx = await mustBeAuthed(req);
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
        return json.ok({
            message: hard ? 'Academic subject hard-deleted.' : 'Academic subject soft-deleted.',
            data,
        });
    } catch (err) {
        return handleApiError(err);
    }
}
export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
