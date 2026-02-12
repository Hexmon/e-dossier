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
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

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

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const sp = new URL(req.url).searchParams;
        const qp = ptOcScoresQuerySchema.parse({
            semester: sp.get('semester') ?? undefined,
        });

        const items = await listOcPtScores(ocId, qp.semester);

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `PT scores retrieved for OC ${ocId}`,
                module: 'physical_training',
                ocId,
                semester: qp.semester ?? null,
                scoreCount: items.length,
            },
        });

        return json.ok({ message: 'PT scores retrieved successfully.', data: { semester: qp.semester, scores: items } });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const dto = ptOcScoresUpsertSchema.parse(await req.json());
        await validateScores(dto.semester, dto.scores);

        await upsertOcPtScores(ocId, dto.semester, dto.scores);
        const items = await listOcPtScores(ocId, dto.semester);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Created PT scores for OC ${ocId} semester ${dto.semester}`,
                ocId,
                module: 'physical_training',
                semester: dto.semester,
                scoreCount: dto.scores.length,
            },
        });
        return json.created({ message: 'PT scores saved successfully.', data: { semester: dto.semester, scores: items } });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
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

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Updated PT scores for OC ${ocId} semester ${dto.semester}`,
                ocId,
                module: 'physical_training',
                semester: dto.semester,
                scoreUpdates: dto.scores?.length ?? 0,
                deletedScores: dto.deleteScoreIds?.length ?? 0,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'PT scores updated successfully.', data: { semester: dto.semester, scores: items } });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const dto = ptOcScoresDeleteSchema.parse(await req.json());

        const deleted = dto.scoreIds?.length
            ? await deleteOcPtScoresByIds(ocId, dto.scoreIds)
            : await deleteOcPtScoresBySemester(ocId, dto.semester);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Deleted PT scores for OC ${ocId} semester ${dto.semester}`,
                ocId,
                module: 'physical_training',
                semester: dto.semester,
                deletedCount: deleted.length,
                hardDeleted: true,
            },
        });
        return json.ok({ message: 'PT scores deleted successfully.', deleted: deleted.map((row) => row.id) });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
