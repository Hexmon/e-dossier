import { json, handleApiError, ApiError } from '@/app/lib/http';

export const runtime = 'nodejs';
import { withAuthz } from '@/app/lib/acx/withAuthz';
import { requireAuth } from '@/app/lib/authz';
import {
    interviewSectionParam,
    interviewFieldCreateSchema,
    interviewFieldQuerySchema,
} from '@/app/lib/interview-template-validators';
import {
    getInterviewTemplateSection,
    listInterviewTemplateFieldsBySection,
    createInterviewTemplateField,
} from '@/app/db/queries/interviewTemplates';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ templateId: string; sectionId: string }> },
) {
    try {
        await requireAuth(req);
        const { templateId, sectionId } = interviewSectionParam.parse(await params);
        const section = await getInterviewTemplateSection(sectionId);
        if (!section || section.templateId !== templateId) throw new ApiError(404, 'Interview section not found', 'not_found');

        const sp = new URL(req.url).searchParams;
        const qp = interviewFieldQuerySchema.parse({
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });
        const items = await listInterviewTemplateFieldsBySection(sectionId, { includeDeleted: qp.includeDeleted ?? false });
        return json.ok({ message: 'Interview template fields retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ templateId: string; sectionId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId, sectionId } = interviewSectionParam.parse(await params);
        const section = await getInterviewTemplateSection(sectionId);
        if (!section || section.templateId !== templateId) throw new ApiError(404, 'Interview section not found', 'not_found');

        const dto = interviewFieldCreateSchema.parse(await req.json());
        const row = await createInterviewTemplateField(templateId, {
            sectionId,
            groupId: null,
            key: dto.key.trim(),
            label: dto.label.trim(),
            fieldType: dto.fieldType,
            required: dto.required ?? false,
            helpText: dto.helpText ?? null,
            maxLength: dto.maxLength ?? null,
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
            captureFiledAt: dto.captureFiledAt ?? true,
            captureSignature: dto.captureSignature ?? false,
        });

        await req.audit.log({
            action: AuditEventType.INTERVIEW_FIELD_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.INTERVIEW_FIELD, id: row.id },
            metadata: {
                description: `Created interview field ${row.key}`,
                templateId,
                sectionId,
                fieldId: row.id,
            },
        });
        return json.created({ message: 'Interview template field created successfully.', field: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', withAuthz(GETHandler));
export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
