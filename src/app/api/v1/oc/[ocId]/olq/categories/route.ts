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
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
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
        return json.ok({ message: 'OLQ categories retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);

        const dto = olqCategoryCreateSchema.parse(await req.json());
        const row = await createOlqCategory({
            code: dto.code.trim(),
            title: dto.title.trim(),
            description: dto.description ?? null,
            displayOrder: dto.displayOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.OC_RECORD_CREATED,
            resourceType: AuditResourceType.OC,
            resourceId: null,
            description: `Created OLQ category ${row.id}`,
            metadata: {
                module: 'olq_categories',
                categoryId: row.id,
                code: row.code,
                title: row.title,
            },
            request: req,
        });
        return json.created({ message: 'OLQ category created successfully.', category: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const POST = withRouteLogging('POST', POSTHandler);
