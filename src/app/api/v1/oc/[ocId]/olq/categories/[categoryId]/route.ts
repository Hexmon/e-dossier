import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAdmin, mustBeAuthed } from '../../../../_checks';
import {
    olqCategoryUpdateSchema,
    olqCategoryQuerySchema,
} from '@/app/lib/olq-validators';
import {
    getOlqCategory,
    updateOlqCategory,
    deleteOlqCategory,
} from '@/app/db/queries/olq';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

const CategoryIdParam = z.object({ categoryId: z.string().uuid() });

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { categoryId, ocId } = { ...(await params), ...CategoryIdParam.parse(await params) };
        const sp = new URL(req.url).searchParams;
        const qp = olqCategoryQuerySchema.parse({
            includeSubtitles: sp.get('includeSubtitles') ?? undefined,
        });

        const row = await getOlqCategory(categoryId, qp.includeSubtitles ?? false);
        if (!row) throw new ApiError(404, 'Category not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `OLQ category ${categoryId} retrieved successfully.`,
                module: 'olq_categories',
                categoryId,
                includeSubtitles: qp.includeSubtitles ?? false,
            },
        });

        return json.ok({ message: 'OLQ category retrieved successfully.', category: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAuthed(req);
        const { categoryId, ocId } = { ...(await params), ...CategoryIdParam.parse(await params) };
        const dto = olqCategoryUpdateSchema.parse(await req.json());
        const row = await updateOlqCategory(categoryId, { ...dto });
        if (!row) throw new ApiError(404, 'Category not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Updated OLQ category ${categoryId}`,
                module: 'olq_categories',
                categoryId,
                changes: Object.keys(dto),
            },
        });
        return json.ok({ message: 'OLQ category updated successfully.', category: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await mustBeAuthed(req);
        const { categoryId, ocId } = { ...(await params), ...CategoryIdParam.parse(await params) };
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteOlqCategory(categoryId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Category not found', 'not_found');

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Deleted OLQ category ${categoryId}`,
                module: 'olq_categories',
                categoryId,
                hardDeleted: body?.hard === true,
            },
        });
        return json.ok({ message: 'OLQ category deleted successfully.', deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const PATCH = withAuditRoute('PATCH', PATCHHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
