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
    getCourseTemplateCategories,
} from '@/app/db/queries/olq';
import { getOcCourseInfo } from '@/app/db/queries/oc';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function ensureCourseTemplateConfigured(ocId: string) {
    const courseInfo = await getOcCourseInfo(ocId);
    if (!courseInfo) throw new ApiError(404, 'OC not found', 'not_found');

    const categories = await getCourseTemplateCategories({
        courseId: courseInfo.courseId,
        includeSubtitles: true,
        isActive: true,
        fallbackToLegacyGlobal: false,
    });
    const hasActiveSubtitle = categories.some((category) => (category.subtitles ?? []).length > 0);

    if (!categories.length || !hasActiveSubtitle) {
        throw new ApiError(
            409,
            'OLQ template is not configured for this course. Contact admin.',
            'configuration_required',
        );
    }
}

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
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

            await req.audit.log({
                action: AuditEventType.API_REQUEST,
                outcome: 'SUCCESS',
                actor: { type: 'user', id: authCtx.userId },
                target: { type: AuditResourceType.OC, id: ocId },
                metadata: {
                    description: `OLQ score ${qp.subtitleId} retrieved for OC ${ocId}`,
                    ocId,
                    module: 'olq',
                    semester: qp.semester,
                    subtitleId: qp.subtitleId,
                },
            });

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

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `OLQ record retrieved for OC ${ocId}`,
                ocId,
                module: 'olq',
                semester: qp.semester,
                includeCategories: qp.includeCategories ?? true,
                categoryId: qp.categoryId,
                subtitleId: qp.subtitleId,
            },
        });

        return json.ok({ message: 'OLQ record retrieved successfully.', data: sheet });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        await ensureCourseTemplateConfigured(ocId);

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

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Created OLQ record for OC ${ocId} semester ${dto.semester}`,
                ocId,
                module: 'olq',
                semester: dto.semester,
                scoreCount: dto.scores?.length ?? 0,
            },
        });
        return json.created({ message: 'OLQ record created successfully.', data: sheet });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        await ensureCourseTemplateConfigured(ocId);

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

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Updated OLQ record for OC ${ocId} semester ${dto.semester}`,
                ocId,
                module: 'olq',
                semester: dto.semester,
                scoreUpdates: dto.scores?.length ?? 0,
                deletedSubtitles: dto.deleteSubtitleIds?.length ?? 0,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'OLQ record updated successfully.', data: sheet });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
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

            await req.audit.log({
                action: AuditEventType.OC_RECORD_DELETED,
                outcome: 'SUCCESS',
                actor: { type: 'user', id: authCtx.userId },
                target: { type: AuditResourceType.OC, id: ocId },
                metadata: {
                    description: `Deleted OLQ subtitle ${dto.subtitleId} for OC ${ocId}`,
                    ocId,
                    module: 'olq',
                    semester: dto.semester,
                    subtitleId: dto.subtitleId,
                    hardDeleted: true,
                },
            });
            return json.ok({ message: 'OLQ score deleted successfully.', deletedScore: dto.subtitleId });
        }

        await deleteOlqHeader(ocId, dto.semester);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Deleted OLQ record for OC ${ocId} semester ${dto.semester}`,
                ocId,
                module: 'olq',
                semester: dto.semester,
                hardDeleted: true,
            },
        });
        return json.ok({ message: 'OLQ record deleted successfully.', deleted: true });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
