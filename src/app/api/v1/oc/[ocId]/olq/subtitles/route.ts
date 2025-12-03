import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import {
    olqSubtitleCreateSchema,
    olqSubtitleQuerySchema,
} from '@/app/lib/olq-validators';
import {
    createOlqSubtitle,
    listOlqSubtitles,
} from '@/app/db/queries/olq';

export async function GET(req: NextRequest, ctx: any) {
    try {
        await requireAuth(req);

        const sp = new URL(req.url).searchParams;
        const qp = olqSubtitleQuerySchema.parse({
            categoryId: sp.get('categoryId') ?? undefined,
            isActive: sp.get('isActive') ?? undefined,
        });

        const items = await listOlqSubtitles({
            categoryId: qp.categoryId,
            isActive: qp.isActive,
        });
        return json.ok({ message: 'OLQ subtitles retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function POST(req: NextRequest, ctx: any) {
    try {
        await requireAdmin(req);

        const dto = olqSubtitleCreateSchema.parse(await req.json());
        const row = await createOlqSubtitle({
            categoryId: dto.categoryId,
            subtitle: dto.subtitle.trim(),
            maxMarks: dto.maxMarks ?? 20,
            displayOrder: dto.displayOrder ?? 0,
            isActive: dto.isActive ?? true,
        });
        return json.created({ message: 'OLQ subtitle created successfully.', subtitle: row });
    } catch (err) {
        return handleApiError(err);
    }
}
