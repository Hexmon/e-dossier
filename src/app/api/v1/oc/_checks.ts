import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError } from '@/app/lib/http';
import { requireAuth, hasAdminRole } from '@/app/lib/authz';
import { db } from '@/app/db/client';
import { ocCadets } from '@/app/db/schema/training/oc';
import { eq } from 'drizzle-orm';
import { canEditAcademics } from '@/lib/academics-access';
import { getCurrentSemesterForCourse, getOcCourseInfo } from '@/app/db/queries/oc';
import { canBypassDossierSemesterLock } from '@/lib/dossier-semester-access';
import {
    normalizeCurrentSemester,
    normalizeSemesterValue,
    normalizeSupportedSemesters,
} from '@/lib/dossier-semester';

export const Param = (name: string) => z.object({ [name]: z.string() });

export async function mustBeAuthed(req: NextRequest) {
    // returns { userId, roles, claims }
    return requireAuth(req);
}

export async function mustBeAdmin(req: NextRequest) {
    const ctx = await requireAuth(req);
    if (!hasAdminRole(ctx.roles)) throw new ApiError(403, 'Admin privileges required', 'forbidden');
    return ctx;
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
    supportedSemesters?: readonly number[];
    currentSemester?: number | null;
}) {
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

    if (!canBypass && requestedSemester !== currentSemester) {
        throw new ApiError(403, 'Only the current semester can be modified.', 'semester_locked', {
            currentSemester,
            requestedSemester,
            supportedSemesters,
        });
    }

    return {
        currentSemester,
        requestedSemester,
        supportedSemesters,
    };
}
