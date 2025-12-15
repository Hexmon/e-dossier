import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists, mustBeAdmin } from '../../../_checks';
import { OcIdParam, SemesterParam, academicSummaryPatchSchema } from '@/app/lib/oc-validators';
import { authorizeOcAccess } from '@/lib/authorization';
import { getOcAcademicSemester, updateOcAcademicSummary, deleteOcAcademicSemester } from '@/app/services/oc-academics';
import { withRouteLogging } from '@/lib/withRouteLogging';

// NOTE: update/delete helpers call createAuditLog internally (see services/oc-academics).

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string; semester: string }> }) {
    try {
        const { ocId } = await parseParam({ params }, OcIdParam);
        const { semester } = await parseParam({ params }, SemesterParam);
        await ensureOcExists(ocId);
        await authorizeOcAccess(req, ocId);
        const semesterData = await getOcAcademicSemester(ocId, semester);
        return json.ok({ message: 'Academic semester retrieved successfully.', data: semesterData });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string; semester: string }> }) {
    try {
        const adminCtx = await mustBeAdmin(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        const { semester } = await parseParam({ params }, SemesterParam);
        await ensureOcExists(ocId);
        const dto = academicSummaryPatchSchema.parse(await req.json());
        const data = await updateOcAcademicSummary(ocId, semester, dto, {
            actorUserId: adminCtx?.userId,
            actorRoles: adminCtx?.roles,
            request: req,
        });
        return json.ok({
            message: 'Academic summary updated successfully.',
            data,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string; semester: string }> }) {
    try {
        const adminCtx = await mustBeAdmin(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        const { semester } = await parseParam({ params }, SemesterParam);
        await ensureOcExists(ocId);
        const hard = new URL(req.url).searchParams.get('hard') === 'true';
        const result = await deleteOcAcademicSemester(ocId, semester, { hard }, {
            actorUserId: adminCtx?.userId,
            actorRoles: adminCtx?.roles,
            request: req,
        });
        return json.ok({
            message: hard ? 'Academic semester hard-deleted.' : 'Academic semester soft-deleted.',
            ...result,
        });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
