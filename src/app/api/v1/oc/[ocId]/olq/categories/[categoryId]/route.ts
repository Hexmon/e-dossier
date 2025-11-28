import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { parseParam, ensureOcExists } from '../../../../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import {
    olqCategoryUpdateSchema,
    olqCategoryQuerySchema,
} from '@/app/lib/olq-validators';
import {
    getOlqCategory,
    updateOlqCategory,
    deleteOlqCategory,
} from '@/app/db/queries/olq';

const CategoryIdParam = z.object({ categoryId: z.string().uuid() });

export async function GET(req: NextRequest, ctx: any) {
    try {
        await requireAuth(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);
        const { categoryId } = CategoryIdParam.parse(await ctx.params);
        const sp = new URL(req.url).searchParams;
        const qp = olqCategoryQuerySchema.parse({
            includeSubtitles: sp.get('includeSubtitles') ?? undefined,
        });

        const row = await getOlqCategory(categoryId, qp.includeSubtitles ?? false);
        if (!row) throw new ApiError(404, 'Category not found', 'not_found');
        return json.ok({ category: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function PATCH(req: NextRequest, ctx: any) {
    try {
        await requireAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);
        const { categoryId } = CategoryIdParam.parse(await ctx.params);
        const dto = olqCategoryUpdateSchema.parse(await req.json());
        const row = await updateOlqCategory(categoryId, { ...dto });
        if (!row) throw new ApiError(404, 'Category not found', 'not_found');
        return json.ok({ category: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function DELETE(req: NextRequest, ctx: any) {
    try {
        await requireAdmin(req);
        const { ocId } = await parseParam(ctx, OcIdParam);
        await ensureOcExists(ocId);
        const { categoryId } = CategoryIdParam.parse(await ctx.params);
        const body = (await req.json().catch(() => ({}))) as { hard?: boolean };
        const row = await deleteOlqCategory(categoryId, { hard: body?.hard === true });
        if (!row) throw new ApiError(404, 'Category not found', 'not_found');
        return json.ok({ deleted: row.id, hardDeleted: body?.hard === true });
    } catch (err) {
        return handleApiError(err);
    }
}
