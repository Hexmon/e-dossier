import { ApiError, handleApiError, json } from '@/app/lib/http';
import { mustBeAuthed } from '../../_checks';
import {
    ptOcBulkQuerySchema,
    ptOcBulkUpsertSchema,
} from '@/app/lib/physical-training-oc-validators';
import {
    deleteOcPtMotivationValuesByFieldIds,
    deleteOcPtScoresByTaskScoreIds,
    listMotivationFieldsByIds,
    listOcPtMotivationValuesByOcIds,
    listOcPtScoresByOcIds,
    listTemplateScoresByIds,
    upsertOcPtMotivationValues,
    upsertOcPtScores,
} from '@/app/db/queries/physicalTrainingOc';
import { listOCsBasic } from '@/app/db/queries/oc';
import { getPtTemplateBySemester } from '@/app/db/queries/physicalTraining';
import { isFreeEntryPtAttemptCode } from '@/app/lib/physical-training-attempts';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';

export const runtime = 'nodejs';

type BulkResult = {
    index: number;
    ocId: string;
    status: 'ok' | 'error';
    scoreUpserts: number;
    scoreClears: number;
    motivationUpserts: number;
    motivationClears: number;
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

function ensureValidTemplateScoreRef(
    row:
        | {
            semester: number;
            typeDeletedAt: Date | null;
            taskDeletedAt: Date | null;
            attemptDeletedAt: Date | null;
            gradeDeletedAt: Date | null;
            typeIsActive: boolean;
            attemptIsActive: boolean;
            gradeIsActive: boolean;
        }
        | undefined,
    semester: number,
) {
    if (!row) return false;
    if (row.semester !== semester) return false;
    if (row.typeDeletedAt || row.taskDeletedAt || row.attemptDeletedAt || row.gradeDeletedAt) return false;
    if (!row.typeIsActive || !row.attemptIsActive || !row.gradeIsActive) return false;
    return true;
}

function ensureValidMotivationFieldRef(
    row:
        | {
            semester: number;
            isActive: boolean;
            deletedAt: Date | null;
        }
        | undefined,
    semester: number,
) {
    if (!row) return false;
    if (row.semester !== semester) return false;
    if (row.deletedAt || !row.isActive) return false;
    return true;
}

async function GETHandler(req: AuditNextRequest) {
    try {
        const authCtx = await mustBeAuthed(req);
        const sp = new URL(req.url).searchParams;

        const query = ptOcBulkQuerySchema.parse({
            courseId: sp.get('courseId') ?? undefined,
            semester: sp.get('semester') ?? undefined,
            active: sp.get('active') ?? undefined,
            q: sp.get('q') ?? undefined,
            platoonId: sp.get('platoonId') ?? undefined,
            platoon: sp.get('platoon') ?? undefined,
        });

        const requestedPlatoon = query.platoonId ?? query.platoon;
        let platoonId: string | undefined;
        let platoonKey: string | undefined;

        if (requestedPlatoon) {
            if (/^[0-9a-fA-F-]{36}$/.test(requestedPlatoon)) {
                platoonId = requestedPlatoon;
            } else {
                platoonKey = requestedPlatoon.toUpperCase();
            }
        }

        const [template, ocRows] = await Promise.all([
            getPtTemplateBySemester(query.semester, { includeDeleted: false }),
            listOCsBasic({
                courseId: query.courseId,
                active: query.active,
                q: query.q,
                platoonId,
                platoonKey,
                limit: 5000,
                sort: 'name_asc',
            }),
        ]);

        const ocIds = ocRows.map((row) => row.id);
        const [scoreRows, motivationRows] = await Promise.all([
            listOcPtScoresByOcIds(ocIds, query.semester),
            listOcPtMotivationValuesByOcIds(ocIds, query.semester),
        ]);

        const scoresByOc = scoreRows.reduce<Record<string, typeof scoreRows>>((acc, row) => {
            acc[row.ocId] = acc[row.ocId] ?? [];
            acc[row.ocId].push(row);
            return acc;
        }, {});

        const motivationByOc = motivationRows.reduce<Record<string, typeof motivationRows>>((acc, row) => {
            acc[row.ocId] = acc[row.ocId] ?? [];
            acc[row.ocId].push(row);
            return acc;
        }, {});

        const items = ocRows.map((oc) => ({
            oc: {
                id: oc.id,
                ocNo: oc.ocNo,
                name: oc.name,
                branch: oc.branch,
                platoonId: oc.platoonId,
                platoonKey: oc.platoonKey,
                platoonName: oc.platoonName,
            },
            scores: scoresByOc[oc.id] ?? [],
            motivationValues: motivationByOc[oc.id] ?? [],
        }));

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: 'collection' },
            metadata: {
                description: 'Bulk physical training marks retrieved successfully.',
                module: 'physical_training_bulk',
                courseId: query.courseId,
                semester: query.semester,
                count: items.length,
            },
        });

        return json.ok({
            message: 'Physical training records retrieved successfully.',
            template,
            items,
            count: items.length,
            successCount: items.length,
            errorCount: 0,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest) {
    try {
        const authCtx = await mustBeAuthed(req);
        const body = ptOcBulkUpsertSchema.parse(await req.json());

        const ocRows = await listOCsBasic({
            courseId: body.courseId,
            active: false,
            limit: 5000,
        });
        const allowedOcIds = new Set(ocRows.map((row) => row.id));

        const allScoreIds = Array.from(new Set(body.items.flatMap((item) => [
            ...(item.scoresUpsert?.map((score) => score.ptTaskScoreId) ?? []),
            ...(item.clearScoreIds ?? []),
        ])));
        const allFieldIds = Array.from(new Set(body.items.flatMap((item) => [
            ...(item.motivationUpsert?.map((entry) => entry.fieldId) ?? []),
            ...(item.clearMotivationFieldIds ?? []),
        ])));

        const [scoreTemplateRows, motivationFieldRows] = await Promise.all([
            listTemplateScoresByIds(allScoreIds),
            listMotivationFieldsByIds(allFieldIds),
        ]);

        const scoreTemplateById = new Map(scoreTemplateRows.map((row) => [row.ptTaskScoreId, row]));
        const motivationFieldById = new Map(motivationFieldRows.map((row) => [row.id, row]));

        const results: BulkResult[] = [];
        let successCount = 0;

        for (let i = 0; i < body.items.length; i += 1) {
            const item = body.items[i];
            try {
                if (!allowedOcIds.has(item.ocId)) {
                    throw new ApiError(400, 'OC does not belong to selected course.', 'invalid_oc', {
                        ocId: item.ocId,
                        courseId: body.courseId,
                    });
                }

                for (const ptTaskScoreId of item.clearScoreIds ?? []) {
                    const row = scoreTemplateById.get(ptTaskScoreId);
                    if (!ensureValidTemplateScoreRef(row, body.semester)) {
                        throw new ApiError(400, 'Invalid PT score reference.', 'invalid_score', {
                            ocId: item.ocId,
                            ptTaskScoreId,
                        });
                    }
                }

                for (const score of item.scoresUpsert ?? []) {
                    const row = scoreTemplateById.get(score.ptTaskScoreId);
                    if (!ensureValidTemplateScoreRef(row, body.semester)) {
                        throw new ApiError(400, 'Invalid PT score reference.', 'invalid_score', {
                            ocId: item.ocId,
                            ptTaskScoreId: score.ptTaskScoreId,
                        });
                    }
                    if (row && score.marksScored > row.maxMarks && !isFreeEntryPtAttemptCode(row.attemptCode)) {
                        throw new ApiError(400, 'Marks exceed template max marks.', 'marks_exceed_max', {
                            ocId: item.ocId,
                            ptTaskScoreId: score.ptTaskScoreId,
                            maxMarks: row.maxMarks,
                            marksScored: score.marksScored,
                        });
                    }
                }

                for (const fieldId of item.clearMotivationFieldIds ?? []) {
                    const row = motivationFieldById.get(fieldId);
                    if (!ensureValidMotivationFieldRef(row, body.semester)) {
                        throw new ApiError(400, 'Invalid PT motivation field.', 'invalid_field', {
                            ocId: item.ocId,
                            fieldId,
                        });
                    }
                }

                for (const entry of item.motivationUpsert ?? []) {
                    const row = motivationFieldById.get(entry.fieldId);
                    if (!ensureValidMotivationFieldRef(row, body.semester)) {
                        throw new ApiError(400, 'Invalid PT motivation field.', 'invalid_field', {
                            ocId: item.ocId,
                            fieldId: entry.fieldId,
                        });
                    }
                }

                let scoreClears = 0;
                let motivationClears = 0;

                if (item.scoresUpsert?.length) {
                    await upsertOcPtScores(item.ocId, body.semester, item.scoresUpsert);
                }

                if (item.clearScoreIds?.length) {
                    const deleted = await deleteOcPtScoresByTaskScoreIds(item.ocId, item.clearScoreIds);
                    scoreClears = deleted.length;
                }

                if (item.motivationUpsert?.length) {
                    await upsertOcPtMotivationValues(item.ocId, body.semester, item.motivationUpsert);
                }

                if (item.clearMotivationFieldIds?.length) {
                    const deleted = await deleteOcPtMotivationValuesByFieldIds(item.ocId, item.clearMotivationFieldIds);
                    motivationClears = deleted.length;
                }

                results.push({
                    index: i,
                    ocId: item.ocId,
                    status: 'ok',
                    scoreUpserts: item.scoresUpsert?.length ?? 0,
                    scoreClears,
                    motivationUpserts: item.motivationUpsert?.length ?? 0,
                    motivationClears,
                });
                successCount += 1;
            } catch (err) {
                if (body.failFast) throw err;
                results.push({
                    index: i,
                    ocId: item.ocId,
                    status: 'error',
                    scoreUpserts: 0,
                    scoreClears: 0,
                    motivationUpserts: 0,
                    motivationClears: 0,
                    error: normalizeError(err),
                });
            }
        }

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: 'collection' },
            metadata: {
                description: 'Bulk physical training records processed successfully.',
                module: 'physical_training_bulk',
                itemCount: body.items.length,
                semester: body.semester,
                courseId: body.courseId,
                successCount,
                errorCount: results.length - successCount,
                failFast: body.failFast,
            },
        });

        return json.ok({
            message: 'Physical training bulk operations processed successfully.',
            items: results,
            count: results.length,
            successCount,
            errorCount: results.length - successCount,
        });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
