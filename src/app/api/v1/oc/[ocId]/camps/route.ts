import { eq } from 'drizzle-orm';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../_checks';
import {
    OcIdParam,
    ocCampQuerySchema,
    ocCampUpsertSchema,
    ocCampUpdateSchema,
} from '@/app/lib/oc-validators';
import {
    getOcCamps,
    upsertOcCamp,
    upsertOcCampReview,
    upsertOcCampActivityScore,
    deleteOcCamp,
    deleteOcCampReview,
    deleteOcCampActivityScore,
    recomputeOcCampTotal,
} from '@/app/db/queries/oc';
import { db } from '@/app/db/client';
import { ocCamps, ocCampActivityScores, ocCampReviews } from '@/app/db/schema/training/oc';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function assertOcCampOwnedByOc(ocCampId: string, ocId: string) {
    const [row] = await db
        .select({
            id: ocCamps.id,
            ocId: ocCamps.ocId,
            trainingCampId: ocCamps.trainingCampId,
        })
        .from(ocCamps)
        .where(eq(ocCamps.id, ocCampId))
        .limit(1);

    if (!row || row.ocId !== ocId) throw new ApiError(404, 'OC camp not found', 'not_found');
    return row;
}

async function getParentCampIdFromReview(reviewId: string, ocId: string) {
    const [row] = await db
        .select({
            ocCampId: ocCampReviews.ocCampId,
            ownerOcId: ocCamps.ocId,
        })
        .from(ocCampReviews)
        .innerJoin(ocCamps, eq(ocCamps.id, ocCampReviews.ocCampId))
        .where(eq(ocCampReviews.id, reviewId))
        .limit(1);

    if (!row || row.ownerOcId !== ocId) throw new ApiError(404, 'Camp review not found', 'not_found');
    return row.ocCampId;
}

async function getParentCampIdFromActivityScore(activityScoreId: string, ocId: string) {
    const [row] = await db
        .select({
            ocCampId: ocCampActivityScores.ocCampId,
            ownerOcId: ocCamps.ocId,
        })
        .from(ocCampActivityScores)
        .innerJoin(ocCamps, eq(ocCamps.id, ocCampActivityScores.ocCampId))
        .where(eq(ocCampActivityScores.id, activityScoreId))
        .limit(1);

    if (!row || row.ownerOcId !== ocId) {
        throw new ApiError(404, 'Camp activity score not found', 'not_found');
    }
    return row.ocCampId;
}

async function loadAllCamps(ocId: string) {
    return getOcCamps({
        ocId,
        includeActivities: true,
        includeReviews: true,
    });
}

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        const sp = new URL(req.url).searchParams;
        const qp = ocCampQuerySchema.parse({
            semester: sp.get('semester') ?? undefined,
            ocCampId: sp.get('ocCampId') ?? undefined,
            campName: sp.get('campName') ?? undefined,
            withReviews: sp.get('withReviews') ?? undefined,
            withActivities: sp.get('withActivities') ?? undefined,
            reviewRole: sp.get('reviewRole') ?? undefined,
            activityName: sp.get('activityName') ?? undefined,
        });

        const result = await getOcCamps({
            ocId,
            ocCampId: qp.ocCampId,
            semester: qp.semester,
            campName: qp.campName ?? undefined,
            includeReviews: qp.withReviews ?? false,
            includeActivities: qp.withActivities ?? false,
            reviewRole: qp.reviewRole,
            activityName: qp.activityName,
        });

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `OC camps retrieved successfully for OC ${ocId}`,
                ocId,
                module: 'camps',
                semester: qp.semester ?? null,
                ocCampId: qp.ocCampId ?? null,
                withReviews: qp.withReviews ?? false,
                withActivities: qp.withActivities ?? false,
            },
        });

        return json.ok({ message: 'OC camps retrieved successfully.', ...result });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);
        const dto = ocCampUpsertSchema.parse(await req.json());
        const { trainingCampId, year, reviews, activities } = dto || {}
        const ocCamp = await upsertOcCamp(ocId, trainingCampId, { year: year });

        if (reviews?.length) {
            for (const review of reviews) {
                await upsertOcCampReview(ocCamp.id, review.role, {
                    sectionTitle: review.sectionTitle,
                    reviewText: review.reviewText,
                });
            }
        }

        if (activities?.length) {
            for (const activity of activities) {
                await upsertOcCampActivityScore(ocCamp.id, activity.trainingCampActivityId, {
                    marksScored: activity.marksScored,
                    remark: activity.remark ?? null,
                });
            }
        }

        await recomputeOcCampTotal(ocCamp.id);
        const { camps, grandTotalMarksScored } = await loadAllCamps(ocId);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Upserted camp ${ocCamp.id} for OC ${ocId}`,
                ocId,
                module: 'camps',
                ocCampId: ocCamp.id,
                trainingCampId: ocCamp.trainingCampId,
                year: ocCamp.year ?? null,
                addedReviews: reviews?.length ?? 0,
                addedActivities: activities?.length ?? 0,
                action: 'create_or_update',
            },
        });

        return json.created({ message: 'OC camp created or updated successfully.', camps, grandTotalMarksScored });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PUTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        const dto = ocCampUpdateSchema.parse(await req.json());

        if (dto.ocCampId) {
            const owned = await assertOcCampOwnedByOc(dto.ocCampId, ocId);
            if (owned.trainingCampId !== dto.trainingCampId) {
                throw new ApiError(400, 'trainingCampId must match the camp being updated', 'bad_request');
            }
        }

        const ocCamp = await upsertOcCamp(ocId, dto.trainingCampId, { year: dto.year });

        if (dto.reviews) {
            for (const review of dto.reviews) {
                await upsertOcCampReview(ocCamp.id, review.role, {
                    sectionTitle: review.sectionTitle,
                    reviewText: review.reviewText,
                });
            }
        }

        if (dto.activities) {
            for (const activity of dto.activities) {
                await upsertOcCampActivityScore(ocCamp.id, activity.trainingCampActivityId, {
                    marksScored: activity.marksScored,
                    remark: activity.remark ?? null,
                });
            }
        }

        await recomputeOcCampTotal(ocCamp.id);
        const { camps, grandTotalMarksScored } = await loadAllCamps(ocId);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Updated camp ${ocCamp.id} for OC ${ocId}`,
                ocId,
                module: 'camps',
                ocCampId: ocCamp.id,
                trainingCampId: ocCamp.trainingCampId,
                year: dto.year ?? null,
                reviewUpdates: dto.reviews?.length ?? 0,
                activityUpdates: dto.activities?.length ?? 0,
            },
        });

        return json.ok({ message: 'OC camp updated successfully.', camps, grandTotalMarksScored });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({params}, OcIdParam);
        await ensureOcExists(ocId);

        const body = (await req.json().catch(() => ({}))) as Record<string, string | undefined>;
        const ocCampId = body.ocCampId;
        const reviewId = body.reviewId;
        const activityScoreId = body.activityScoreId;

        let deletedMeta: Record<string, any> | null = null;
        if (ocCampId) {
            await assertOcCampOwnedByOc(ocCampId, ocId);
            await deleteOcCamp(ocCampId);
            deletedMeta = { target: 'camp', ocCampId };
        } else if (reviewId) {
            const parentCampId = await getParentCampIdFromReview(reviewId, ocId);
            await deleteOcCampReview(reviewId);
            await recomputeOcCampTotal(parentCampId);
            deletedMeta = { target: 'camp_review', reviewId, ocCampId: parentCampId };
        } else if (activityScoreId) {
            const parentCampId = await getParentCampIdFromActivityScore(activityScoreId, ocId);
            await deleteOcCampActivityScore(activityScoreId);
            await recomputeOcCampTotal(parentCampId);
            deletedMeta = { target: 'camp_activity', activityScoreId, ocCampId: parentCampId };
        } else {
            throw new ApiError(400, 'Specify ocCampId, reviewId or activityScoreId', 'bad_request');
        }

        const { camps, grandTotalMarksScored } = await loadAllCamps(ocId);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Deleted camp data for OC ${ocId}`,
                ocId,
                module: 'camps',
                ...(deletedMeta ?? {}),
            },
        });
        return json.ok({ message: 'OC camp data deleted successfully.', camps, grandTotalMarksScored });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);

export const PUT = withAuditRoute('PUT', PUTHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
