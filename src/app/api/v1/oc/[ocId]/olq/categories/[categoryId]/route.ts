import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed } from '../../../../_checks';
import {
    olqCategoryUpdateSchema,
    olqCategoryQuerySchema,
} from '@/app/lib/olq-validators';
import {
    getOlqCategory,
    updateOlqCategory,
    deleteOlqCategory,
} from '@/app/db/queries/olq';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

const CategoryIdParam = z.object({ categoryId: z.string().uuid() });

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { categoryId } = CategoryIdParam.parse(await params);
        const sp = new URL(req.url).searchParams;
        const qp = olqCategoryQuerySchema.parse({
            includeSubtitles: sp.get('includeSubtitles') ?? undefined,
        });

        const row = await getOlqCategory(categoryId, qp.includeSubtitles ?? false);
        if (!row) throw new ApiError(404, 'Category not found', 'not_found');
        return json.ok({ message: 'OLQ category retrieved successfully.', category: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { categoryId } = CategoryIdParam.parse(await params);
        const dto = olqCategoryUpdateSchema.parse(await req.json());
        const row = await updateOlqCategory(categoryId, { ...dto });
        if (!row) throw new ApiError(404, 'Category not found', 'not_found');

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_UPDATED,
            resourceType: AuditResourceType.OC,
            resourceId: null,
            description: `Updated OLQ category ${categoryId}`,
            metadata: {
                module: 'olq_categories',
                categoryId,
                changes: Object.keys(dto),
            },
            request: req,
        });
        return json.ok({ message: 'OLQ category updated successfully.', category: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { categoryId } = CategoryIdParam.parse(await params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteOlqCategory(categoryId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Category not found', 'not_found');

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_DELETED,
            resourceType: AuditResourceType.OC,
            resourceId: null,
            description: `Deleted OLQ category ${categoryId}`,
            metadata: {
                module: 'olq_categories',
                categoryId,
                hardDeleted: body?.hard === true,
            },
            request: req,
        });
        return json.ok({ message: 'OLQ category deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
