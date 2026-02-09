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
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await requireAuth(req);
        const { ocId } = await params;

        const sp = new URL(req.url).searchParams;
        const qp = olqSubtitleQuerySchema.parse({
            categoryId: sp.get('categoryId') ?? undefined,
            isActive: sp.get('isActive') ?? undefined,
        });

        const items = await listOlqSubtitles({
            categoryId: qp.categoryId,
            isActive: qp.isActive,
        });

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: 'OLQ subtitles retrieved successfully.',
                ocId,
                module: 'olq_subtitles',
                categoryId: qp.categoryId,
                isActive: qp.isActive,
                count: items.length,
            },
        });

        return json.ok({ message: 'OLQ subtitles retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { ocId } = await params;

        const dto = olqSubtitleCreateSchema.parse(await req.json());
        const row = await createOlqSubtitle({
            categoryId: dto.categoryId,
            subtitle: dto.subtitle.trim(),
            maxMarks: dto.maxMarks ?? 20,
            displayOrder: dto.displayOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Created OLQ subtitle ${row.id}`,
                module: 'olq_subtitles',
                subtitleId: row.id,
                categoryId: dto.categoryId,
            },
        });
        return json.created({ message: 'OLQ subtitle created successfully.', subtitle: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);
