import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { interviewFieldOptionCreateSchema, interviewFieldOptionQuerySchema, interviewFieldParam } from '@/app/lib/interview-template-validators';
import {
    getInterviewTemplateField,
    listInterviewTemplateFieldOptions,
    createInterviewTemplateFieldOption,
} from '@/app/db/queries/interviewTemplates';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ templateId: string; fieldId: string }> },
) {
    try {
        await requireAuth(req);
        const { templateId, fieldId } = interviewFieldParam.parse(await params);
        const field = await getInterviewTemplateField(fieldId);
        if (!field || field.templateId !== templateId) throw new ApiError(404, 'Interview field not found', 'not_found');

        const sp = new URL(req.url).searchParams;
        const qp = interviewFieldOptionQuerySchema.parse({
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });
        const items = await listInterviewTemplateFieldOptions(fieldId, { includeDeleted: qp.includeDeleted ?? false });
        return json.ok({ message: 'Interview field options retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ templateId: string; fieldId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId, fieldId } = interviewFieldParam.parse(await params);
        const field = await getInterviewTemplateField(fieldId);
        if (!field || field.templateId !== templateId) throw new ApiError(404, 'Interview field not found', 'not_found');

        const dto = interviewFieldOptionCreateSchema.parse(await req.json());
        const row = await createInterviewTemplateFieldOption(fieldId, {
            code: dto.code.trim(),
            label: dto.label.trim(),
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        await req.audit.log({
            action: AuditEventType.INTERVIEW_FIELD_OPTION_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_FIELD_OPTION, id: row.id },
            metadata: {
                description: `Created interview field option ${row.code}`,
                templateId,
                fieldId,
                optionId: row.id,
            },
        });
        return json.created({ message: 'Interview field option created successfully.', option: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const POST = withAuditRoute('POST', POSTHandler);
