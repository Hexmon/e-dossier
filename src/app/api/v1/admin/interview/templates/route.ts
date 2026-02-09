import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { interviewTemplateCreateSchema, interviewTemplateQuerySchema } from '@/app/lib/interview-template-validators';
import { listInterviewTemplates, createInterviewTemplate } from '@/app/db/queries/interviewTemplates';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
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

async function POSTHandler(req: AuditNextRequest) {
    try {
        const adminCtx = await requireAuth(req);
        const dto = interviewTemplateCreateSchema.parse(await req.json());
        const row = await createInterviewTemplate({
            code: dto.code.trim(),
            title: dto.title.trim(),
            description: dto.description ?? null,
            allowMultiple: dto.allowMultiple ?? true,
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await req.audit.log({
            action: AuditEventType.INTERVIEW_TEMPLATE_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_TEMPLATE, id: row.id },
            metadata: {
                description: `Created interview template ${row.code}`,
                templateId: row.id,
                code: row.code,
            },
        });
        return json.created({ message: 'Interview template created successfully.', template: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
