import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import {
    olqCategoryCreateSchema,
    olqCategoryQuerySchema,
} from '@/app/lib/olq-validators';
import {
    createOlqCategory,
    listOlqCategories,
} from '@/app/db/queries/olq';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await requireAuth(req);

        const sp = new URL(req.url).searchParams;
        const qp = olqCategoryQuerySchema.parse({
            includeSubtitles: sp.get('includeSubtitles') ?? undefined,
            isActive: sp.get('isActive') ?? undefined,
        });

        const items = await listOlqCategories({
            includeSubtitles: qp.includeSubtitles ?? false,
            isActive: qp.isActive,
        });
        return json.ok({ items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function POST(req: NextRequest, ctx: any) {
    try {
        await requireAdmin(req);

        const dto = olqCategoryCreateSchema.parse(await req.json());
        const row = await createOlqCategory({
            code: dto.code.trim(),
            title: dto.title.trim(),
            description: dto.description ?? null,
            displayOrder: dto.displayOrder ?? 0,
            isActive: dto.isActive ?? true,
        });
        return json.created({ category: row });
    } catch (err) {
        return handleApiError(err);
    }
}
