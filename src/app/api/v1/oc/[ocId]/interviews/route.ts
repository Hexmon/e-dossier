import { NextRequest } from 'next/server';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import { interviewOcCreateSchema, interviewOcQuerySchema } from '@/app/lib/interview-oc-validators';
import {
    getInterviewTemplateBase,
    listInterviewTemplateSemestersByTemplate,
    listInterviewTemplateFieldsByIds,
    listInterviewTemplateGroupsByIds,
    createOcInterview,
    listOcInterviews,
    listOcInterviewFieldValues,
    listOcInterviewGroupRows,
    listOcInterviewGroupValues,
    upsertOcInterviewFieldValues,
    upsertOcInterviewGroupRows,
    upsertOcInterviewGroupValues,
} from '@/app/db/queries/interviewOc';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

function cleanText(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

async function validateTemplateAndPayload(params: {
    templateId: string;
    semester: number | null | undefined;
    fields?: Array<{ fieldId: string }>;
    groups?: Array<{ groupId: string; rows?: Array<{ fields?: Array<{ fieldId: string }> }> }>;
}) {
    const template = await getInterviewTemplateBase(params.templateId);
    if (!template || template.deletedAt) {
        throw new ApiError(404, 'Interview template not found', 'not_found');
    }
    if (!template.isActive) {
        throw new ApiError(400, 'Interview template is inactive', 'template_inactive');
    }

    const semRows = await listInterviewTemplateSemestersByTemplate(params.templateId);
    const semesters = semRows.map((row) => row.semester);
    if (semesters.length) {
        if (params.semester === undefined || params.semester === null) {
            throw new ApiError(400, 'Semester is required for this template', 'semester_required');
        }
        if (!semesters.includes(params.semester)) {
            throw new ApiError(400, 'Semester is not allowed for this template', 'invalid_semester', {
                allowedSemesters: semesters,
            });
        }
    }

    const topLevelFields = params.fields ?? [];
    const groupPayloads = params.groups ?? [];

    const fieldIds = new Set<string>();
    for (const item of topLevelFields) fieldIds.add(item.fieldId);
    for (const group of groupPayloads) {
        for (const row of group.rows ?? []) {
            for (const field of row.fields ?? []) fieldIds.add(field.fieldId);
        }
    }

    const groupIds = Array.from(new Set(groupPayloads.map((g) => g.groupId)));

    const fieldRows = await listInterviewTemplateFieldsByIds(Array.from(fieldIds));
    const groupRows = await listInterviewTemplateGroupsByIds(groupIds);

    const fieldMap = new Map(fieldRows.map((row) => [row.id, row]));
    const groupMap = new Map(groupRows.map((row) => [row.id, row]));

    const invalidFieldIds: string[] = [];
    for (const fieldId of fieldIds) {
        const field = fieldMap.get(fieldId);
        if (!field || field.templateId !== params.templateId || field.deletedAt || !field.isActive) {
            invalidFieldIds.push(fieldId);
        }
    }
    if (invalidFieldIds.length) {
        throw new ApiError(400, 'Invalid interview field references', 'invalid_field', { invalidFieldIds });
    }

    const invalidGroupIds: string[] = [];
    for (const groupId of groupIds) {
        const group = groupMap.get(groupId);
        if (!group || group.templateId !== params.templateId || group.deletedAt || !group.isActive) {
            invalidGroupIds.push(groupId);
        }
    }
    if (invalidGroupIds.length) {
        throw new ApiError(400, 'Invalid interview group references', 'invalid_group', { invalidGroupIds });
    }

    for (const field of topLevelFields) {
        const row = fieldMap.get(field.fieldId);
        if (row?.groupId) {
            throw new ApiError(400, 'Group fields must be submitted under groups', 'field_group_mismatch', {
                fieldId: field.fieldId,
                groupId: row.groupId,
            });
        }
    }

    for (const group of groupPayloads) {
        for (const row of group.rows ?? []) {
            for (const field of row.fields ?? []) {
                const fieldRow = fieldMap.get(field.fieldId);
                if (fieldRow?.groupId !== group.groupId) {
                    throw new ApiError(400, 'Field does not belong to group', 'field_group_mismatch', {
                        fieldId: field.fieldId,
                        groupId: group.groupId,
                    });
                }
            }
        }
    }
}

async function buildInterviewItems(ocId: string, filters: { templateId?: string; semester?: number }) {
    const interviews = await listOcInterviews(ocId, filters);
    if (!interviews.length) return [];

    const interviewIds = interviews.map((row) => row.id);
    const fieldValues = await listOcInterviewFieldValues(interviewIds);
    const groupRows = await listOcInterviewGroupRows(interviewIds);
    const rowIds = groupRows.map((row) => row.id);
    const groupValues = await listOcInterviewGroupValues(rowIds);

    const fieldsByInterview = new Map<string, typeof fieldValues>();
    for (const row of fieldValues) {
        const list = fieldsByInterview.get(row.interviewId) ?? [];
        list.push(row);
        fieldsByInterview.set(row.interviewId, list);
    }

    const valuesByRow = new Map<string, typeof groupValues>();
    for (const row of groupValues) {
        const list = valuesByRow.get(row.rowId) ?? [];
        list.push(row);
        valuesByRow.set(row.rowId, list);
    }

    const rowsByInterview = new Map<string, Map<string, Array<any>>>();
    for (const row of groupRows) {
        const groupMap = rowsByInterview.get(row.interviewId) ?? new Map<string, Array<any>>();
        const rows = groupMap.get(row.groupId) ?? [];
        rows.push({
            id: row.id,
            groupId: row.groupId,
            rowIndex: row.rowIndex,
            fields: valuesByRow.get(row.id) ?? [],
        });
        groupMap.set(row.groupId, rows);
        rowsByInterview.set(row.interviewId, groupMap);
    }

    return interviews.map((row) => ({
        ...row,
        fields: fieldsByInterview.get(row.id) ?? [],
        groups: Array.from(rowsByInterview.get(row.id)?.entries() ?? []).map(([groupId, rows]) => ({
            groupId,
            rows: rows.sort((a, b) => a.rowIndex - b.rowIndex),
        })),
    }));
}

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const sp = new URL(req.url).searchParams;
        const qp = interviewOcQuerySchema.parse({
            templateId: sp.get('templateId') ?? undefined,
            semester: sp.get('semester') ?? undefined,
        });

        const items = await buildInterviewItems(ocId, { templateId: qp.templateId, semester: qp.semester });
        return json.ok({ message: 'Interview records retrieved successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ ocId: string }> }) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        await ensureOcExists(ocId);

        const dto = interviewOcCreateSchema.parse(await req.json());

        await validateTemplateAndPayload({
            templateId: dto.templateId,
            semester: dto.semester ?? null,
            fields: dto.fields,
            groups: dto.groups,
        });

        const interview = await createOcInterview({
            ocId,
            templateId: dto.templateId,
            semester: dto.semester ?? null,
            course: cleanText(dto.course) ?? null,
        });

        const fields = (dto.fields ?? []).map((item) => ({
            fieldId: item.fieldId,
            valueText: cleanText(item.valueText) ?? null,
            valueDate: item.valueDate ?? null,
            valueNumber: item.valueNumber ?? null,
            valueBool: item.valueBool ?? null,
            valueJson: item.valueJson ?? null,
            filedAt: item.filedAt ?? null,
            filedByName: cleanText(item.filedByName) ?? null,
            filedByRank: cleanText(item.filedByRank) ?? null,
            filedByAppointment: cleanText(item.filedByAppointment) ?? null,
        }));
        await upsertOcInterviewFieldValues(interview.id, fields);

        const groupRowInputs: Array<{ groupId: string; rowIndex: number }> = [];
        for (const group of dto.groups ?? []) {
            for (const row of group.rows ?? []) {
                groupRowInputs.push({ groupId: group.groupId, rowIndex: row.rowIndex });
            }
        }
        const createdRows = await upsertOcInterviewGroupRows(interview.id, groupRowInputs);
        const rowKeyMap = new Map(createdRows.map((row) => [`${row.groupId}:${row.rowIndex}`, row.id]));

        for (const group of dto.groups ?? []) {
            for (const row of group.rows ?? []) {
                const rowId = rowKeyMap.get(`${group.groupId}:${row.rowIndex}`);
                if (!rowId) continue;
                const values = (row.fields ?? []).map((item) => ({
                    fieldId: item.fieldId,
                    valueText: cleanText(item.valueText) ?? null,
                    valueDate: item.valueDate ?? null,
                    valueNumber: item.valueNumber ?? null,
                    valueBool: item.valueBool ?? null,
                    valueJson: item.valueJson ?? null,
                    filedAt: item.filedAt ?? null,
                    filedByName: cleanText(item.filedByName) ?? null,
                    filedByRank: cleanText(item.filedByRank) ?? null,
                    filedByAppointment: cleanText(item.filedByAppointment) ?? null,
                }));
                await upsertOcInterviewGroupValues(rowId, values);
            }
        }

        const items = await buildInterviewItems(ocId, { templateId: dto.templateId, semester: dto.semester ?? undefined });

        await createAuditLog({
            actorUserId: authCtx.userId,
            eventType: AuditEventType.OC_RECORD_CREATED,
            resourceType: AuditResourceType.OC,
            resourceId: ocId,
            description: `Created interview record for OC ${ocId}`,
            metadata: {
                ocId,
                module: 'interview',
                templateId: dto.templateId,
                semester: dto.semester ?? null,
            },
            request: req,
        });
        return json.created({ message: 'Interview record created successfully.', items, count: items.length });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withRouteLogging('GET', GETHandler);
export const POST = withRouteLogging('POST', POSTHandler);
