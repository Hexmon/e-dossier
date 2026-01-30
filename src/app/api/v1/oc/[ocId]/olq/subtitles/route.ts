import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import {
    olqSubtitleCreateSchema,
    olqSubtitleQuerySchema,
} from '@/app/lib/olq-validators';
import {
    createOlqSubtitle,
    listOlqSubtitles,
} from '@/app/db/queries/olq';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
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

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);

        const dto = olqSubtitleCreateSchema.parse(await req.json());
        const row = await createOlqSubtitle({
            categoryId: dto.categoryId,
            subtitle: dto.subtitle.trim(),
            maxMarks: dto.maxMarks ?? 20,
            displayOrder: dto.displayOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.OC_RECORD_CREATED,
            resourceType: AuditResourceType.OC,
            resourceId: null,
            description: `Created OLQ subtitle ${row.id}`,
            metadata: {
                module: 'olq_subtitles',
                subtitleId: row.id,
                categoryId: dto.categoryId,
            },
            request: req,
        });
        return json.created({ message: 'OLQ subtitle created successfully.', subtitle: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const POST = withRouteLogging('POST', POSTHandler);
