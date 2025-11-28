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

export async function GET(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
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
            return json.ok({ data: score });
        }

        const sheet = await getOlqSheet({
            ocId,
            semester: qp.semester,
            includeCategories: qp.includeCategories ?? true,
            categoryId: qp.categoryId,
            subtitleId: qp.subtitleId,
        });
        if (!sheet) throw new ApiError(404, 'OLQ record not found', 'not_found');
        return json.ok({ data: sheet });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function POST(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
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

        return json.created({ data: sheet });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function PATCH(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
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

        return json.ok({ data: sheet });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function DELETE(req: NextRequest, ctx: any) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
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
            return json.ok({ deletedScore: dto.subtitleId });
        }

        await deleteOlqHeader(ocId, dto.semester);
        return json.ok({ deleted: true });
    } catch (err) {
        return handleApiError(err);
    }
}
