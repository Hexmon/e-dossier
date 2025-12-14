import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import {
    olqUpsertSchema,
    olqUpdateSchema,
    olqDeleteSchema,
    olqQuerySchema,
} from '@/app/lib/olq-validators';
import {
    getOlqSheet,
    getOlqScore,
    upsertOlqWithScores,
    updateOlqWithScores,
    deleteOlqHeader,
    deleteOlqScore,
    recomputeOlqTotal,
} from '@/app/db/queries/olq';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        const sp = new URL(req.url).searchParams;
        const qp = olqQuerySchema.parse({
            ocId,
            semester: sp.get('semester') ?? undefined,
            includeCategories: sp.get('includeCategories') ?? undefined,
            categoryId: sp.get('categoryId') ?? undefined,
            subtitleId: sp.get('subtitleId') ?? undefined,
        });

        if (qp.subtitleId) {
            const score = await getOlqScore(ocId, qp.semester, qp.subtitleId);
            if (!score) throw new ApiError(404, 'OLQ score not found', 'not_found');
            return json.ok({ message: 'OLQ score retrieved successfully.', data: score });
        }

        const sheet = await getOlqSheet({
            ocId,
            semester: qp.semester,
            includeCategories: qp.includeCategories ?? true,
            categoryId: qp.categoryId,
            subtitleId: qp.subtitleId,
        });
        if (!sheet) throw new ApiError(404, 'OLQ record not found', 'not_found');
        return json.ok({ message: 'OLQ record retrieved successfully.', data: sheet });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        const raw = await req.json();
        const dto = olqUpsertSchema.parse({ ...raw, ocId });

        await upsertOlqWithScores({
            ocId,
            semester: dto.semester,
            remarks: dto.remarks ?? null,
            scores: dto.scores,
        });

        const sheet = await getOlqSheet({
            ocId,
            semester: dto.semester,
            includeCategories: true,
        });

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_CREATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Created OLQ record for OC ${ocId} semester ${dto.semester}`,
            metadata: {
                ocId,
                module: 'olq',
                semester: dto.semester,
                scoreCount: dto.scores?.length ?? 0,
            },
            request: req,
        });
        return json.created({ message: 'OLQ record created successfully.', data: sheet });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        const raw = await req.json();
        const dto = olqUpdateSchema.parse(raw);

        await updateOlqWithScores({
            ocId,
            semester: dto.semester,
            remarks: dto.remarks ?? null,
            scores: dto.scores,
            deleteSubtitleIds: dto.deleteSubtitleIds,
        });

        const sheet = await getOlqSheet({
            ocId,
            semester: dto.semester,
            includeCategories: true,
        });

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_UPDATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Updated OLQ record for OC ${ocId} semester ${dto.semester}`,
            metadata: {
                ocId,
                module: 'olq',
                semester: dto.semester,
                scoreUpdates: dto.scores?.length ?? 0,
                deletedSubtitles: dto.deleteSubtitleIds?.length ?? 0,
                changes: Object.keys(dto),
            },
            request: req,
        });
        return json.ok({ message: 'OLQ record updated successfully.', data: sheet });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        const dto = olqDeleteSchema.parse(await req.json());

        const sheet = await getOlqSheet({
            ocId,
            semester: dto.semester,
            includeCategories: false,
        });
        if (!sheet) throw new ApiError(404, 'OLQ record not found', 'not_found');

        if (dto.subtitleId) {
            const deleted = await deleteOlqScore(sheet.id, dto.subtitleId);
            if (!deleted) throw new ApiError(404, 'OLQ score not found', 'not_found');
            await recomputeOlqTotal(sheet.id);

            await createAuditLog({
                actorUserId: authCtx.userId,
                eventType: AuditEventType.OC_RECORD_DELETED,
                resourceType: AuditResourceType.OC,
                resourceId: ocId,
                description: `Deleted OLQ subtitle ${dto.subtitleId} for OC ${ocId}`,
                metadata: {
                    ocId,
                    module: 'olq',
                    semester: dto.semester,
                    subtitleId: dto.subtitleId,
                    hardDeleted: true,
                },
                request: req,
            });
            return json.ok({ message: 'OLQ score deleted successfully.', deletedScore: dto.subtitleId });
        }

        await deleteOlqHeader(ocId, dto.semester);

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_DELETED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Deleted OLQ record for OC ${ocId} semester ${dto.semester}`,
            metadata: {
                ocId,
                module: 'olq',
                semester: dto.semester,
                hardDeleted: true,
            },
            request: req,
        });
        return json.ok({ message: 'OLQ record deleted successfully.', deleted: true });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const POST = withRouteLogging('POST', POSTHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
