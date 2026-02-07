import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { academicSubjectBulkRequestSchema, Semester } from '@/app/lib/oc-validators';
import { mustBeAdmin, mustBeAuthed } from '../../_checks';
import { updateOcAcademicSubject, deleteOcAcademicSubject, getOcAcademicSemester, getOcAcademics } from '@/app/services/oc-academics';
import { withRouteLogging } from '@/lib/withRouteLogging';

type BulkResult = {
    index: number;
    ocId: string;
    semester: number;
    subjectId: string;
    op: 'upsert' | 'delete';
    status: 'ok' | 'error';
    data?: unknown;
    error?: { status: number; code: string; message: string; extras?: Record<string, unknown> };
};

function normalizeError(err: unknown) {
    if (err instanceof ApiError) {
        return {
            status: err.status,
            code: err.code ?? 'error',
            message: err.message,
            extras: err.extras,
        };
    }
    if (err instanceof Error) {
        return { status: 500, code: 'error', message: err.message };
    }
    return { status: 500, code: 'error', message: 'Unexpected error' };
}

function parseCsv(value: string | null): string[] {
    if (!value) return [];
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function filterSemesterSubjects(semesterData: any, subjectIds: Set<string>) {
    if (!subjectIds.size) return semesterData;
    const subjects = (semesterData?.subjects ?? []).filter((entry: any) => {
        const id = entry?.subject?.id;
        const code = entry?.subject?.code;
        return (id && subjectIds.has(id)) || (code && subjectIds.has(code));
    });
    return { ...semesterData, subjects };
}

async function GETHandler(req: NextRequest) {
    try {
        await mustBeAuthed(req);
        const sp = new URL(req.url).searchParams;

        const ocIds = parseCsv(sp.get('ocIds'));
        if (!ocIds.length) {
            throw new ApiError(400, 'ocIds is required (comma-separated UUIDs).', 'bad_request');
        }

        const subjectIds = new Set(parseCsv(sp.get('subjectIds')));
        const semesterRaw = sp.get('semester');
        let semester: number | undefined;
        if (semesterRaw != null && semesterRaw !== '') {
            const parsed = Semester.safeParse(semesterRaw);
            if (!parsed.success) {
                throw new ApiError(400, 'Invalid semester.', 'bad_request');
            }
            semester = parsed.data;
        }

        const results: Array<{
            ocId: string;
            status: 'ok' | 'error';
            data?: unknown;
            error?: { status: number; code: string; message: string; extras?: Record<string, unknown> };
        }> = [];

        let successCount = 0;

        for (const ocId of ocIds) {
            try {
                const data = semester
                    ? filterSemesterSubjects(await getOcAcademicSemester(ocId, semester), subjectIds)
                    : (await getOcAcademics(ocId)).map((entry) => filterSemesterSubjects(entry, subjectIds));

                results.push({ ocId, status: 'ok', data });
                successCount += 1;
            } catch (err) {
                results.push({ ocId, status: 'error', error: normalizeError(err) });
            }
        }

        return json.ok({
            message: 'Academic records retrieved successfully.',
            items: results,
            count: results.length,
            successCount,
            errorCount: results.length - successCount,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest) {
    try {
        const authCtx = await mustBeAuthed(req);
        const body = academicSubjectBulkRequestSchema.parse(await req.json());

        const results: BulkResult[] = [];
        let successCount = 0;

        for (let i = 0; i < body.items.length; i++) {
            const item = body.items[i];
            const isDelete = item.op === 'delete';
            const op: 'upsert' | 'delete' = isDelete ? 'delete' : 'upsert';
            try {
                let data: unknown;
                if (isDelete) {
                    data = await deleteOcAcademicSubject(
                        item.ocId,
                        item.semester,
                        item.subjectId,
                        { hard: item.hard },
                        {
                            actorUserId: authCtx?.userId,
                            actorRoles: authCtx?.roles,
                            request: req,
                        },
                    );
                } else {
                    data = await updateOcAcademicSubject(
                        item.ocId,
                        item.semester,
                        item.subjectId,
                        { theory: item.theory, practical: item.practical },
                        {
                            actorUserId: authCtx?.userId,
                            actorRoles: authCtx?.roles,
                            request: req,
                        },
                    );
                }

                results.push({
                    index: i,
                    ocId: item.ocId,
                    semester: item.semester,
                    subjectId: item.subjectId,
                    op,
                    status: 'ok',
                    data,
                });
                successCount += 1;
            } catch (err) {
                if (body.failFast) throw err;
                results.push({
                    index: i,
                    ocId: item.ocId,
                    semester: item.semester,
                    subjectId: item.subjectId,
                    op,
                    status: 'error',
                    error: normalizeError(err),
                });
            }
        }

        return json.ok({
            message: 'Academic subjects processed successfully.',
            items: results,
            count: results.length,
            successCount,
            errorCount: results.length - successCount,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);

export const POST = withRouteLogging('POST', POSTHandler);
