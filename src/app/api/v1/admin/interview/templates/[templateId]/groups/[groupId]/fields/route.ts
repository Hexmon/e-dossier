import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { interviewGroupParam, interviewFieldCreateSchema, interviewFieldQuerySchema } from '@/app/lib/interview-template-validators';
import {
    getInterviewTemplateGroup,
    listInterviewTemplateFieldsByGroup,
    createInterviewTemplateField,
} from '@/app/db/queries/interviewTemplates';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(
    req: NextRequest,
    { params }: { params: Promise<{ templateId: string; groupId: string }> },
) {
    try {
        await requireAuth(req);
        const { templateId, groupId } = interviewGroupParam.parse(await params);
        const group = await getInterviewTemplateGroup(groupId);
        if (!group || group.templateId !== templateId) throw new ApiError(404, 'Interview group not found', 'not_found');

        const sp = new URL(req.url).searchParams;
        const qp = interviewFieldQuerySchema.parse({
            includeDeleted: sp.get('includeDeleted') ?? undefined,
        });
        const items = await listInterviewTemplateFieldsByGroup(groupId, { includeDeleted: qp.includeDeleted ?? false });
        return json.ok({ message: 'Interview template fields retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(
    req: NextRequest,
    { params }: { params: Promise<{ templateId: string; groupId: string }> },
) {
    try {
        const adminCtx = await requireAuth(req);
        const { templateId, groupId } = interviewGroupParam.parse(await params);
        const group = await getInterviewTemplateGroup(groupId);
        if (!group || group.templateId !== templateId) throw new ApiError(404, 'Interview group not found', 'not_found');

        const dto = interviewFieldCreateSchema.parse(await req.json());
        const row = await createInterviewTemplateField(templateId, {
            sectionId: null,
            groupId,
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

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INTERVIEW_FIELD_CREATED,
            resourceType: AuditResourceType.INTERVIEW_FIELD,
            resourceId: row.id,
            description: `Created interview field ${row.key}`,
            metadata: {
                templateId,
                groupId,
                fieldId: row.id,
            },
            request: req,
            required: true,
        });
        return json.created({ message: 'Interview template field created successfully.', field: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
