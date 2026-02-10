import { json, handleApiError, ApiError } from '@/app/lib/http';
import { mustBeAuthed, parseParam, ensureOcExists } from '../../../_checks';
import { OcIdParam } from '@/app/lib/oc-validators';
import { InterviewIdParam, interviewOcUpdateSchema } from '@/app/lib/interview-oc-validators';
import {
    getOcInterview,
    updateOcInterview,
    deleteOcInterview,
    listOcInterviewFieldValues,
    listOcInterviewGroupRows,
    listOcInterviewGroupValues,
    upsertOcInterviewFieldValues,
    upsertOcInterviewGroupRows,
    upsertOcInterviewGroupValues,
    deleteOcInterviewGroupRowsByIds,
    getInterviewTemplateBase,
    listInterviewTemplateSemestersByTemplate,
    listInterviewTemplateFieldsByIds,
    listInterviewTemplateGroupsByIds,
} from '@/app/db/queries/interviewOc';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

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

async function buildInterviewItem(interviewId: string) {
    const fieldValues = await listOcInterviewFieldValues([interviewId]);
    const groupRows = await listOcInterviewGroupRows([interviewId]);
    const rowIds = groupRows.map((row) => row.id);
    const groupValues = await listOcInterviewGroupValues(rowIds);

    const valuesByRow = new Map<string, typeof groupValues>();
    for (const row of groupValues) {
        const list = valuesByRow.get(row.rowId) ?? [];
        list.push(row);
        valuesByRow.set(row.rowId, list);
    }

    const groupMap = new Map<string, Array<any>>();
    for (const row of groupRows) {
        const rows = groupMap.get(row.groupId) ?? [];
        rows.push({
            id: row.id,
            groupId: row.groupId,
            rowIndex: row.rowIndex,
            fields: valuesByRow.get(row.id) ?? [],
        });
        groupMap.set(row.groupId, rows);
    }

    return {
        fields: fieldValues,
        groups: Array.from(groupMap.entries()).map(([groupId, rows]) => ({
            groupId,
            rows: rows.sort((a, b) => a.rowIndex - b.rowIndex),
        })),
    };
}

async function GETHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ ocId: string; interviewId: string }> },
) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        const { interviewId } = await parseParam({ params }, InterviewIdParam);
        await ensureOcExists(ocId);

        const interview = await getOcInterview(interviewId);
        if (!interview || interview.ocId !== ocId) throw new ApiError(404, 'Interview record not found', 'not_found');

        const details = await buildInterviewItem(interviewId);

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Interview record ${interviewId} retrieved successfully for OC ${ocId}`,
                ocId,
                module: 'interview',
                interviewId,
                templateId: interview.templateId,
            },
        });

        return json.ok({
            message: 'Interview record retrieved successfully.',
            interview: { ...interview, ...details },
        });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ ocId: string; interviewId: string }> },
) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        const { interviewId } = await parseParam({ params }, InterviewIdParam);
        await ensureOcExists(ocId);

        const interview = await getOcInterview(interviewId);
        if (!interview || interview.ocId !== ocId) throw new ApiError(404, 'Interview record not found', 'not_found');

        const dto = interviewOcUpdateSchema.parse(await req.json());
        if (dto.templateId && dto.templateId !== interview.templateId) {
            throw new ApiError(400, 'Template cannot be changed for interview record', 'template_mismatch');
        }

        const effectiveSemester =
            dto.semester == null
                ? interview.semester == null
                    ? null
                    : Number(interview.semester)
                : Number(dto.semester);
        await validateTemplateAndPayload({
            templateId: interview.templateId,
            semester: effectiveSemester,
            fields: dto.fields,
            groups: dto.groups,
        });

        if (dto.semester !== undefined || dto.course !== undefined) {
            await updateOcInterview(interviewId, {
                ...(dto.semester !== undefined ? { semester: dto.semester ?? null } : {}),
                ...(dto.course !== undefined ? { course: cleanText(dto.course) ?? null } : {}),
            });
        }

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
        if (fields.length) {
            await upsertOcInterviewFieldValues(interviewId, fields);
        }

        const groupRowInputs: Array<{ groupId: string; rowIndex: number }> = [];
        for (const group of dto.groups ?? []) {
            for (const row of group.rows ?? []) {
                groupRowInputs.push({ groupId: group.groupId, rowIndex: row.rowIndex });
            }
        }
        const createdRows = await upsertOcInterviewGroupRows(interviewId, groupRowInputs);
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
                if (values.length) {
                    await upsertOcInterviewGroupValues(rowId, values);
                }
            }
        }

        if (dto.deleteGroupRowIds?.length) {
            await deleteOcInterviewGroupRowsByIds(interviewId, dto.deleteGroupRowIds);
        }

        const details = await buildInterviewItem(interviewId);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_UPDATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Updated interview record ${interviewId} for OC ${ocId}`,
                ocId,
                module: 'interview',
                templateId: interview.templateId,
                interviewId,
                changes: Object.keys(dto),
            },
        });
        return json.ok({
            message: 'Interview record updated successfully.',
            interview: { ...interview, ...details },
        });
    } catch (err) {
        return handleApiError(err);
    }
}

async function DELETEHandler(
    req: AuditNextRequest,
    { params }: { params: Promise<{ ocId: string; interviewId: string }> },
) {
    try {
        const authCtx = await mustBeAuthed(req);
        const { ocId } = await parseParam({ params }, OcIdParam);
        const { interviewId } = await parseParam({ params }, InterviewIdParam);
        await ensureOcExists(ocId);

        const interview = await getOcInterview(interviewId);
        if (!interview || interview.ocId !== ocId) throw new ApiError(404, 'Interview record not found', 'not_found');

        await deleteOcInterview(interviewId);

        await req.audit.log({
            action: AuditEventType.OC_RECORD_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: authCtx.userId },
            target: { type: AuditResourceType.OC, id: ocId },
            metadata: {
                description: `Deleted interview record ${interviewId} for OC ${ocId}`,
                ocId,
                module: 'interview',
                templateId: interview.templateId,
                interviewId,
                hardDeleted: true,
            },
        });
        return json.ok({ message: 'Interview record deleted successfully.', deleted: interviewId });
    } catch (err) {
        return handleApiError(err);
    }
}

export const GET = withAuditRoute('GET', GETHandler);
export const PATCH = withAuditRoute('PATCH', PATCHHandler);
export const DELETE = withAuditRoute('DELETE', DELETEHandler);
