import { json, handleApiError } from '@/app/lib/http';
import { parseParam, ensureOcExists, mustBeAdmin } from '../../../_checks';
import { OcIdParam, SemesterParam, academicSummaryPatchSchema } from '@/app/lib/oc-validators';
import { authorizeOcAccess } from '@/lib/authorization';
import { getOcAcademicSemester, updateOcAcademicSummary, deleteOcAcademicSemester } from '@/app/services/oc-academics';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string; semester: string }> }) {
    try {
        const { ocId } = await parseParam({ params }, OcIdParam);
        const { semester } = await parseParam({ params }, SemesterParam);
        await ensureOcExists(ocId);
        const authCtx = await authorizeOcAccess(req, ocId);
        const semesterData = await getOcAcademicSemester(ocId, semester);

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Academic semester ${semester} retrieved successfully for OC ${ocId}`,
                ocId,
                module: 'academics',
                semester,
            },
        });

        return json.ok({ message: 'Academic semester retrieved successfully.', data: semesterData });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string; semester: string }> }) {
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

        await req.audit.log({
            action: AuditEventType.OC_ACADEMICS_SUMMARY_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC_ACADEMICS, id: ocId },
            metadata: {
                description: `Academic summary updated for OC ${ocId}, semester ${semester}`,
                ocId,
                semester,
                changes: Object.keys(dto),
            },
        });

        return json.ok({
            message: 'Academic summary updated successfully.',
            data,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string; semester: string }> }) {
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

        await req.audit.log({
            action: AuditEventType.OC_ACADEMICS_SEMESTER_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC_ACADEMICS, id: ocId },
            metadata: {
                description: `Academic semester ${semester} deleted for OC ${ocId}`,
                ocId,
                semester,
                hardDeleted: hard,
            },
        });

        return json.ok({
            message: hard ? 'Academic semester hard-deleted.' : 'Academic semester soft-deleted.',
            ...result,
        });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
