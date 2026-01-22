import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import {
    ptOcScoresQuerySchema,
    ptOcScoresUpsertSchema,
    ptOcScoresUpdateSchema,
    ptOcScoresDeleteSchema,
} from '@/app/lib/physical-training-oc-validators';
import {
    listTemplateScoresByIds,
    listOcPtScores,
    upsertOcPtScores,
    deleteOcPtScoresByIds,
    deleteOcPtScoresBySemester,
} from '@/app/db/queries/physicalTrainingOc';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function validateScores(semester: number, scores: Array<{ ptTaskScoreId: string; marksScored: number }>) {
    const uniqueIds = Array.from(new Set(scores.map((s) => s.ptTaskScoreId)));
    const templateRows = await listTemplateScoresByIds(uniqueIds);
    const rowById = new Map(templateRows.map((row) => [row.ptTaskScoreId, row]));

    const invalidIds: string[] = [];
    for (const id of uniqueIds) {
        const row = rowById.get(id);
        if (!row) {
            invalidIds.push(id);
            continue;
        }
        if (row.semester !== semester) {
            invalidIds.push(id);
            continue;
        }
        if (row.typeDeletedAt || row.taskDeletedAt || row.attemptDeletedAt || row.gradeDeletedAt) {
            invalidIds.push(id);
            continue;
        }
        if (!row.typeIsActive || !row.attemptIsActive || !row.gradeIsActive) {
            invalidIds.push(id);
            continue;
        }
    }

    if (invalidIds.length) {
        throw new ApiError(400, 'Invalid PT score references', 'invalid_score', { invalidIds });
    }

    for (const item of scores) {
        const row = rowById.get(item.ptTaskScoreId);
        if (!row) continue;
        if (item.marksScored > row.maxMarks) {
            throw new ApiError(400, 'Marks exceed template max marks', 'marks_exceed_max', {
                ptTaskScoreId: item.ptTaskScoreId,
                maxMarks: row.maxMarks,
                marksScored: item.marksScored,
            });
        }
    }
}

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const sp = new URL(req.url).searchParams;
        const qp = ptOcScoresQuerySchema.parse({
            semester: sp.get('semester') ?? undefined,
        });

        const items = await listOcPtScores(ocId, qp.semester);
        return json.ok({ message: 'PT scores retrieved successfully.', data: { semester: qp.semester, scores: items } });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const dto = ptOcScoresUpsertSchema.parse(await req.json());
        await validateScores(dto.semester, dto.scores);

        await upsertOcPtScores(ocId, dto.semester, dto.scores);
        const items = await listOcPtScores(ocId, dto.semester);

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_CREATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Created PT scores for OC ${ocId} semester ${dto.semester}`,
            metadata: {
                ocId,
                module: 'physical_training',
                semester: dto.semester,
                scoreCount: dto.scores.length,
            },
            request: req,
        });
        return json.created({ message: 'PT scores saved successfully.', data: { semester: dto.semester, scores: items } });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const dto = ptOcScoresUpdateSchema.parse(await req.json());

        if (dto.scores?.length) {
            await validateScores(dto.semester, dto.scores);
            await upsertOcPtScores(ocId, dto.semester, dto.scores);
        }

        if (dto.deleteScoreIds?.length) {
            await deleteOcPtScoresByIds(ocId, dto.deleteScoreIds);
        }

        const items = await listOcPtScores(ocId, dto.semester);

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_UPDATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Updated PT scores for OC ${ocId} semester ${dto.semester}`,
            metadata: {
                ocId,
                module: 'physical_training',
                semester: dto.semester,
                scoreUpdates: dto.scores?.length ?? 0,
                deletedScores: dto.deleteScoreIds?.length ?? 0,
                changes: Object.keys(dto),
            },
            request: req,
        });
        return json.ok({ message: 'PT scores updated successfully.', data: { semester: dto.semester, scores: items } });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const dto = ptOcScoresDeleteSchema.parse(await req.json());

        const deleted = dto.scoreIds?.length
            ? await deleteOcPtScoresByIds(ocId, dto.scoreIds)
            : await deleteOcPtScoresBySemester(ocId, dto.semester);

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_DELETED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Deleted PT scores for OC ${ocId} semester ${dto.semester}`,
            metadata: {
                ocId,
                module: 'physical_training',
                semester: dto.semester,
                deletedCount: deleted.length,
                hardDeleted: true,
            },
            request: req,
        });
        return json.ok({ message: 'PT scores deleted successfully.', deleted: deleted.map((row) => row.id) });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
export const PATCH = withRouteLogging('PATCH', PATCHHandler);
export const DELETE = withRouteLogging('DELETE', DELETEHandler);
