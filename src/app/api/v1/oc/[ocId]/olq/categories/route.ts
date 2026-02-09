import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import {
    olqCategoryCreateSchema,
    olqCategoryQuerySchema,
} from '@/app/lib/olq-validators';
import {
    createOlqCategory,
    listOlqCategories,
} from '@/app/db/queries/olq';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await requireAuth(req);
        const { ocId } = await params;

        const sp = new URL(req.url).searchParams;
        const qp = olqCategoryQuerySchema.parse({
            includeSubtitles: sp.get('includeSubtitles') ?? undefined,
            isActive: sp.get('isActive') ?? undefined,
        });

        const items = await listOlqCategories({
            includeSubtitles: qp.includeSubtitles ?? false,
            isActive: qp.isActive,
        });

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: 'OLQ categories retrieved successfully.',
                ocId,
                module: 'olq_categories',
                includeSubtitles: qp.includeSubtitles ?? false,
                isActive: qp.isActive,
                count: items.length,
            },
        });

        return json.ok({ message: 'OLQ categories retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: AuditNextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAuth(req);
        const { ocId } = await params;

        const dto = olqCategoryCreateSchema.parse(await req.json());
        const row = await createOlqCategory({
            code: dto.code.trim(),
            title: dto.title.trim(),
            description: dto.description ?? null,
            displayOrder: dto.displayOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await req.audit.log({
            action: AuditEventType.OC_RECORD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Created OLQ category ${row.id}`,
                module: 'olq_categories',
                categoryId: row.id,
                code: row.code,
                title: row.title,
            },
        });
        return json.created({ message: 'OLQ category created successfully.', category: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);
