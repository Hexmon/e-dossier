import { json, handleApiError, ApiError } from '@/app/lib/http';
import { academicSubjectBulkRequestSchema, Semester } from '@/app/lib/oc-validators';
import { mustBeAdmin } from '../../_checks';
import { updateOcAcademicSubject, deleteOcAcademicSubject, getOcAcademicSemester, getOcAcademics } from '@/app/services/oc-academics';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

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

async function GETHandler(req: AuditNextRequest) {
    try {
        const adminCtx = await mustBeAdmin(req);
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

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC_ACADEMICS, id: 'collection' },
            metadata: {
                description: 'Bulk academic records retrieved successfully.',
                module: 'academics_bulk',
                ocCount: ocIds.length,
                semester: semester ?? null,
                subjectFilterCount: subjectIds.size,
                successCount,
                errorCount: results.length - successCount,
            },
        });

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

async function POSTHandler(req: AuditNextRequest) {
    try {
        const adminCtx = await mustBeAdmin(req);
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
                            actorUserId: adminCtx?.userId,
                            actorRoles: adminCtx?.roles,
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
                            actorUserId: adminCtx?.userId,
                            actorRoles: adminCtx?.roles,
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

        const upsertCount = body.items.filter((item) => item.op !== 'delete').length;
        const deleteCount = body.items.filter((item) => item.op === 'delete').length;

        await req.audit.log({
            action: AuditEventType.OC_ACADEMICS_SUBJECT_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC_ACADEMICS, id: 'collection' },
            metadata: {
                description: 'Bulk academic subject operations processed successfully.',
                module: 'academics_bulk',
                itemCount: body.items.length,
                upsertCount,
                deleteCount,
                successCount,
                errorCount: results.length - successCount,
                failFast: body.failFast,
            },
        });

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

export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);
