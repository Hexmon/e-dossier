import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { interviewFieldOptionCreateSchema, interviewFieldOptionQuerySchema, interviewFieldParam } from '@/app/lib/interview-template-validators';
import {
    getInterviewTemplateField,
    listInterviewTemplateFieldOptions,
    createInterviewTemplateFieldOption,
} from '@/app/db/queries/interviewTemplates';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(
    req: NextRequest,
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
    req: NextRequest,
    { params }: { params: Promise<{ templateId: string; fieldId: string }> },
) {
    try {
        const adminCtx = await requireAdmin(req);
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

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.INTERVIEW_FIELD_OPTION_CREATED,
            resourceType: AuditResourceType.INTERVIEW_FIELD_OPTION,
            resourceId: row.id,
            description: `Created interview field option ${row.code}`,
            metadata: {
                templateId,
                fieldId,
                optionId: row.id,
            },
            request: req,
            required: true,
        });
        return json.created({ message: 'Interview field option created successfully.', option: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
