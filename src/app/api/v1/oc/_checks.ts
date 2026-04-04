import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { db } from '@/app/db/client';
import { ocCadets } from '@/app/db/schema/training/oc';
import { eq } from 'drizzle-orm';
import { canEditAcademics } from '@/lib/academics-access';
import { authorizeOcAccess } from '@/lib/authorization';
import { getCurrentSemesterForCourse, getOcCourseInfo } from '@/app/db/queries/oc';
import { canBypassDossierSemesterLock } from '@/lib/dossier-semester-access';
import {
    normalizeCurrentSemester,
    normalizeSemesterValue,
    normalizeSupportedSemesters,
} from '@/lib/dossier-semester';
import {
    auditOcSemesterOverrideIfUsed,
    getSemesterOverrideReason,
    type SemesterWriteDecision,
} from '@/app/lib/oc-semester-write';
import { canWriteMedicalRecords } from '@/lib/medical-access';

export const Param = (name: string) => z.object({ [name]: z.string() });

const OC_ROUTE_ID_PATTERN = /^\/api\/v1\/oc\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:\/|$)/i;

function getOcIdFromRequestPath(req: NextRequest): string | null {
    const pathname = new URL(req.url).pathname;
    const match = pathname.match(OC_ROUTE_ID_PATTERN);
    return match?.[1] ?? null;
}

export async function mustBeAuthed(req: NextRequest) {
    const ocId = getOcIdFromRequestPath(req);
    if (ocId) {
        return authorizeOcAccess(req, ocId);
    }

    return requireAuth(req);
}

export async function mustHaveOcAccess(req: NextRequest, ocId: string) {
    return authorizeOcAccess(req, ocId);
}

export async function mustBeAdmin(req: NextRequest) {
    return requireAdmin(req);
}

export async function mustBeAcademicsEditor(req: NextRequest) {
    const ctx = await requireAuth(req);
    if (
        !canEditAcademics({
            roles: ctx.roles,
            position: (ctx.claims as any)?.apt?.position ?? null,
        })
    ) {
        throw new ApiError(403, 'You do not have permission to modify academics.', 'forbidden');
    }
    return ctx;
}

export async function parseParam<T extends z.ZodTypeAny>(
    { params }: { params: { [k: string]: string } } | { params: Promise<{ [k: string]: string }> },
    schema: T
): Promise<z.infer<T>> {
    const raw = await params;
    // FIX: coerce to string before trim to avoid TS error
    const normalized = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, decodeURIComponent(String(v ?? '').trim())])
    );
    return schema.parse(normalized);
}

export async function ensureOcExists(ocId: string) {
    const [row] = await db.select({ id: ocCadets.id }).from(ocCadets).where(eq(ocCadets.id, ocId)).limit(1);
    if (!row) throw new ApiError(404, 'OC not found', 'not_found');
}

type SemesterWriteAuthContext = {
    userId?: string | null;
    roles?: string[] | null;
    claims?: Record<string, any> | null;
};

export async function getOcCurrentSemester(ocId: string) {
    const courseInfo = await getOcCourseInfo(ocId);
    if (!courseInfo?.courseId) {
        return 1;
    }

    return normalizeCurrentSemester(await getCurrentSemesterForCourse(courseInfo.courseId));
}

export async function assertOcSemesterWriteAllowed(params: {
    ocId: string;
    requestedSemester: number | string | null | undefined;
    authContext: SemesterWriteAuthContext;
    request?: NextRequest;
    supportedSemesters?: readonly number[];
    currentSemester?: number | null;
}): Promise<SemesterWriteDecision> {
    const supportedSemesters = normalizeSupportedSemesters(params.supportedSemesters);
    const currentSemester = normalizeCurrentSemester(
        params.currentSemester ?? (await getOcCurrentSemester(params.ocId))
    );
    const requestedSemester = normalizeSemesterValue(params.requestedSemester);

    if (requestedSemester === null) {
        throw new ApiError(400, 'Semester is required for this write operation.', 'semester_required', {
            currentSemester,
            requestedSemester: params.requestedSemester ?? null,
            supportedSemesters,
        });
    }

    const canBypass = canBypassDossierSemesterLock({
        roles: params.authContext.roles,
        position: params.authContext.claims?.apt?.position ?? null,
    });

    const overrideReason = getSemesterOverrideReason(params.request);
    const overrideApplied = requestedSemester !== currentSemester && canBypass;

    if (!canBypass && requestedSemester !== currentSemester) {
        throw new ApiError(403, 'Only the current semester can be modified.', 'semester_locked', {
            currentSemester,
            requestedSemester,
            supportedSemesters,
        });
    }

    if (overrideApplied && !overrideReason) {
        throw new ApiError(
            400,
            'A semester override reason is required for super admin edits outside the current semester.',
            'override_reason_required',
            {
                currentSemester,
                requestedSemester,
                supportedSemesters,
            }
        );
    }

    const decision: SemesterWriteDecision = {
        currentSemester,
        requestedSemester,
        supportedSemesters,
        overrideApplied,
        overrideReason,
    };

    if (params.request) {
        await auditOcSemesterOverrideIfUsed({
            request: params.request,
            authContext: params.authContext,
            ocId: params.ocId,
            decision,
        });
    }

    return decision;
}

export async function mustBeMedicalWriter(req: NextRequest, ocId?: string) {
    const auth = ocId ? await authorizeOcAccess(req, ocId) : await mustBeAuthed(req);
    const authAny = auth as any;
    const scopeType = authAny?.apt?.scope?.type ?? authAny?.claims?.apt?.scope?.type ?? null;
    const position = authAny?.apt?.position ?? authAny?.claims?.apt?.position ?? null;

    if (
        canWriteMedicalRecords({
            roles: auth.roles,
            position,
            scopeType,
        })
    ) {
        return auth;
    }

    throw new ApiError(
        403,
        'Medical updates are restricted to the commander-equivalent role for this platoon.',
        'forbidden'
    );
}
