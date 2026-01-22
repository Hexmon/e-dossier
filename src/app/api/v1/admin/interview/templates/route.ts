import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { interviewTemplateCreateSchema, interviewTemplateQuerySchema } from '@/app/lib/interview-template-validators';
import { listInterviewTemplates, createInterviewTemplate } from '@/app/db/queries/interviewTemplates';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest) {
    try {
        await requireAuth(req);
        const sp = new URL(req.url).searchParams;
        const qp = interviewTemplateQuerySchema.parse({
            semester: sp.get('semester') ?? undefined,
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });
        const items = await listInterviewTemplates({
            semester: qp.semester,
            includeDeleted: qp.includeDeleted ?? false,
        });
        return json.ok({ message: 'Interview templates retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest) {
    try {
        const adminCtx = await requireAdmin(req);
        const dto = interviewTemplateCreateSchema.parse(await req.json());
        const row = await createInterviewTemplate({
            code: dto.code.trim(),
            title: dto.title.trim(),
            description: dto.description ?? null,
            allowMultiple: dto.allowMultiple ?? true,
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INTERVIEW_TEMPLATE_CREATED,
            resourceType: AuditResourceType.INTERVIEW_TEMPLATE,
            resourceId: row.id,
            description: `Created interview template ${row.code}`,
            metadata: {
                templateId: row.id,
                code: row.code,
            },
            request: req,
            required: true,
        });
        return json.created({ message: 'Interview template created successfully.', template: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
