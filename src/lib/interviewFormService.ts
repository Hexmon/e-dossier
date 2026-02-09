import { apiRequest } from "@/app/lib/apiClient";
import { toast } from "sonner";
import type { InterviewOfficer } from "@/types/interview";
import type { SpecialInterviewRecord, TermVariant } from "@/store/slices/termInterviewSlice";
import type { TemplateInfo } from "@/types/interview-templates";
import { termKeyConfig, type TemplateMappings } from "@/lib/interviewTemplateMatching";
import {
    buildFieldPayload,
    mapTemplateKeyToTermFormKey,
    parseInterviewResponse,
    pickLatestInterview,
    readFieldValue,
    resolveGroupField,
    resolveSpecialKey,
    resolveTermField,
    type OcInterviewItem,
} from "@/lib/interviewFieldUtils";

type InitialIndex = Record<string, { interviewId: string; templateId: string } | null>;

type TermIndex = Record<
    string,
    {
        interviewId: string;
        templateId: string;
        groupRowMap?: Record<number, string>;
    }
>;

function resolveInitialField(template: TemplateInfo, formKey: string) {
    return template.fieldsByKey.get(formKey.trim().toLowerCase()) ?? null;
}

export async function fetchLatestInterviewByTemplate(
    ocId: string,
    templateId: string,
    semester?: number | null,
    opts?: { onlyWithoutSemester?: boolean },
) {
    const resp: any = await apiRequest<any>({
        method: "GET",
        endpoint: `/api/v1/oc/${ocId}/interviews`,
        query: {
            templateId,
            ...(semester !== undefined && semester !== null ? { semester } : {}),
        },
    });

    let items: OcInterviewItem[] = resp?.items ?? [];
    if (opts?.onlyWithoutSemester) {
        items = items.filter((item) => item.semester === null || item.semester === undefined);
    }

    return pickLatestInterview(items);
}

export async function fetchInitialInterviews(
    ocId: string,
    mappings: TemplateMappings,
    initialIndexRef: { current: InitialIndex },
) {
    const resp: any = await apiRequest<any>({
        method: "GET",
        endpoint: `/api/v1/oc/${ocId}/interviews`,
    });
    const items: OcInterviewItem[] = resp?.items ?? [];

    const result: Record<string, Record<InterviewOfficer, Record<string, string | boolean>>> = {};
    initialIndexRef.current = {};

    const officers: InterviewOfficer[] = ["plcdr", "dscoord", "dycdr", "cdr"];
    for (const officer of officers) {
        const match = mappings.byKind[officer];
        if (!match) continue;

        const templateItems = items.filter((item) => item.templateId === match.template.id);
        const usesSemesters = (match.template.semesters?.length ?? 0) > 0;

        if (usesSemesters) {
            const bySemester = new Map<number, OcInterviewItem[]>();
            for (const item of templateItems) {
                const semester = item.semester ?? null;
                if (!semester || semester < 1 || semester > 6) continue;
                if (!match.template.semesters?.includes(semester)) continue;
                const list = bySemester.get(semester) ?? [];
                list.push(item);
                bySemester.set(semester, list);
            }

            for (const [semester, list] of bySemester.entries()) {
                const interview = pickLatestInterview(list);
                if (!interview) continue;

                const formData: Record<string, string | boolean> = {};
                for (const fieldValue of interview.fields ?? []) {
                    const field = match.template.fieldsById.get(fieldValue.fieldId);
                    if (!field) continue;
                    const value = readFieldValue(field, fieldValue);
                    if (value !== undefined) formData[field.key] = value;
                }

                const semesterKey = String(semester);
                if (!result[semesterKey]) {
                    result[semesterKey] = { plcdr: {}, dscoord: {}, dycdr: {}, cdr: {} };
                }
                result[semesterKey][officer] = formData;
                initialIndexRef.current[`${officer}:${semesterKey}`] = {
                    interviewId: interview.id,
                    templateId: interview.templateId,
                };
            }
        } else {
            const interview = pickLatestInterview(
                templateItems.filter((item) => item.semester === null || item.semester === undefined),
            );
            if (!interview) continue;

            const formData: Record<string, string | boolean> = {};
            for (const fieldValue of interview.fields ?? []) {
                const field = match.template.fieldsById.get(fieldValue.fieldId);
                if (!field) continue;
                const value = readFieldValue(field, fieldValue);
                if (value !== undefined) formData[field.key] = value;
            }

            const semesterKey = "none";
            if (!result[semesterKey]) {
                result[semesterKey] = { plcdr: {}, dscoord: {}, dycdr: {}, cdr: {} };
            }
            result[semesterKey][officer] = formData;
            initialIndexRef.current[`${officer}:${semesterKey}`] = {
                interviewId: interview.id,
                templateId: interview.templateId,
            };
        }
    }

    return result;
}

export async function fetchTermInterviews(
    ocId: string,
    mappings: TemplateMappings,
    termIndexRef: { current: TermIndex },
) {
    const resp: any = await apiRequest<any>({
        method: "GET",
        endpoint: `/api/v1/oc/${ocId}/interviews`,
    });
    const items: OcInterviewItem[] = resp?.items ?? [];

    const result: Record<
        number,
        Record<TermVariant, { formFields: Record<string, string>; specialInterviews?: SpecialInterviewRecord[] }>
    > = {};
    termIndexRef.current = {};

    for (const item of items) {
        const mapping = mappings.byTemplateId.get(item.templateId);
        if (!mapping) continue;
        const variant = mapping.kind as TermVariant;
        if (!(variant in termKeyConfig)) continue;

        const termIndex = item.semester ?? null;
        if (!termIndex || termIndex < 1 || termIndex > 6) continue;

        if (!result[termIndex]) {
            result[termIndex] = {
                beginning: { formFields: {} },
                postmid: { formFields: {} },
                special: { formFields: {}, specialInterviews: [] },
            };
        }

        const templateMatch = mappings.byKind[variant];
        if (!templateMatch) continue;

        if (variant === "special") {
            const groupId = templateMatch.groupId;
            if (!groupId) continue;

            const group = item.groups?.find((g) => g.groupId === groupId);
            const rows = group?.rows ?? [];
            const specialInterviews = rows
                .map((row) => {
                    const record: SpecialInterviewRecord = {
                        date: "",
                        summary: "",
                        interviewedBy: "",
                        rowId: row.id,
                        rowIndex: row.rowIndex,
                    };

                    for (const fieldValue of row.fields ?? []) {
                        const field = templateMatch.template.fieldsById.get(fieldValue.fieldId);
                        if (!field) continue;

                        if (resolveSpecialKey(field.key, "date")) {
                            record.date = String(readFieldValue(field, fieldValue) ?? "");
                        } else if (resolveSpecialKey(field.key, "summary")) {
                            record.summary = String(readFieldValue(field, fieldValue) ?? "");
                        } else if (resolveSpecialKey(field.key, "interviewedBy")) {
                            record.interviewedBy = String(readFieldValue(field, fieldValue) ?? "");
                        }
                    }

                    return record;
                })
                .sort((a, b) => (a.rowIndex ?? 0) - (b.rowIndex ?? 0));

            result[termIndex].special = {
                formFields: {},
                specialInterviews,
            };

            const rowMap: Record<number, string> = {};
            for (const row of rows) {
                rowMap[row.rowIndex] = row.id;
            }

            termIndexRef.current[`${termIndex}_${variant}`] = {
                interviewId: item.id,
                templateId: item.templateId,
                groupRowMap: rowMap,
            };

            continue;
        }

        const formFields: Record<string, string> = {};
        for (const fieldValue of item.fields ?? []) {
            const field = templateMatch.template.fieldsById.get(fieldValue.fieldId);
            if (!field) continue;
            const formKey = mapTemplateKeyToTermFormKey(termIndex, variant, field.key);
            const value = readFieldValue(field, fieldValue);
            if (value !== undefined) formFields[formKey] = String(value);
        }

        result[termIndex][variant] = { formFields };
        termIndexRef.current[`${termIndex}_${variant}`] = {
            interviewId: item.id,
            templateId: item.templateId,
        };
    }

    return result;
}

export async function saveInitialInterview(
    ocId: string,
    officer: InterviewOfficer,
    formData: Record<string, unknown>,
    mappings: TemplateMappings,
    initialIndexRef: { current: InitialIndex },
    semester?: number,
) {
    const match = mappings.byKind[officer];
    if (!match) {
        toast.error("Interview template not configured");
        return null;
    }

    const usesSemesters = (match.template.semesters?.length ?? 0) > 0;
    if (usesSemesters && (semester === undefined || semester === null)) {
        toast.error("Semester is required for this interview");
        return null;
    }
    if (usesSemesters && semester && !match.template.semesters?.includes(semester)) {
        toast.error("Semester is not allowed for this interview");
        return null;
    }

    const fields = Object.entries(formData)
        .map(([key, value]) => {
            const field = resolveInitialField(match.template, key);
            return field ? buildFieldPayload(field, value) : null;
        })
        .filter(Boolean) as Array<{
        fieldId: string;
        valueText?: string | null;
        valueDate?: string | null;
        valueNumber?: number | null;
        valueBool?: boolean | null;
    }>;

    const semesterKey = usesSemesters ? String(semester) : "none";
    const currentIndex = initialIndexRef.current[`${officer}:${semesterKey}`];
    let interview: OcInterviewItem | null = null;

    if (currentIndex?.interviewId) {
        const resp: any = await apiRequest<any>({
            method: "PATCH",
            endpoint: `/api/v1/oc/${ocId}/interviews/${currentIndex.interviewId}`,
            body: { fields, ...(usesSemesters ? { semester } : {}) },
        });
        interview = parseInterviewResponse(resp);
    } else {
        const existing = await fetchLatestInterviewByTemplate(
            ocId,
            match.template.id,
            usesSemesters ? semester : undefined,
            usesSemesters ? undefined : { onlyWithoutSemester: true }
        );
        if (existing?.id) {
            const resp: any = await apiRequest<any>({
                method: "PATCH",
                endpoint: `/api/v1/oc/${ocId}/interviews/${existing.id}`,
                body: { fields, ...(usesSemesters ? { semester } : {}) },
            });
            interview = parseInterviewResponse(resp);
        } else {
            const resp: any = await apiRequest<any>({
                method: "POST",
                endpoint: `/api/v1/oc/${ocId}/interviews`,
                body: {
                    templateId: match.template.id,
                    ...(usesSemesters ? { semester } : {}),
                    fields,
                },
            });
            interview = parseInterviewResponse(resp);
        }
    }

    if (!interview) {
        toast.error("Failed to save interview");
        return null;
    }

    initialIndexRef.current[`${officer}:${semesterKey}`] = {
        interviewId: interview.id,
        templateId: interview.templateId,
    };

    return interview;
}

export async function saveTermInterview(
    ocId: string,
    termIndex: number,
    variant: TermVariant,
    formFields: Record<string, string>,
    specialInterviews: SpecialInterviewRecord[] | undefined,
    mappings: TemplateMappings,
    termIndexRef: { current: TermIndex },
) {
    const match = mappings.byKind[variant];
    if (!match) {
        toast.error("Interview template not configured");
        return null;
    }

    const prefix = `term${termIndex}_${variant}_`;
    const fields = Object.entries(formFields)
        .map(([key, value]) => {
            const baseKey = key.startsWith(prefix) ? key.slice(prefix.length) : key;
            const field = resolveTermField(match.template, baseKey);
            return field ? buildFieldPayload(field, value) : null;
        })
        .filter(Boolean) as Array<{
        fieldId: string;
        valueText?: string | null;
        valueDate?: string | null;
        valueNumber?: number | null;
        valueBool?: boolean | null;
    }>;

    let groups: Array<{ groupId: string; rows: Array<{ rowIndex: number; fields: any[] }> }> | undefined;
    let deleteGroupRowIds: string[] | undefined;

    if (variant === "special") {
        const groupId = match.groupId;
        if (!groupId) {
            toast.error("Special interview template group not configured");
            return null;
        }

        const group = match.template.groups.find((g) => g.id === groupId);
        if (!group) {
            toast.error("Special interview group not found");
            return null;
        }

        const rows = (specialInterviews ?? []).map((record, index) => {
            const rowIndex = record.rowIndex ?? index;
            const rowFields: any[] = [];

            const dateField = resolveGroupField(group, "date");
            const summaryField = resolveGroupField(group, "summary");
            const interviewerField = resolveGroupField(group, "interviewedBy");

            if (dateField) rowFields.push(buildFieldPayload(dateField, record.date));
            if (summaryField) rowFields.push(buildFieldPayload(summaryField, record.summary));
            if (interviewerField) rowFields.push(buildFieldPayload(interviewerField, record.interviewedBy));

            return { rowIndex, fields: rowFields.filter(Boolean) };
        });

        groups = [{ groupId, rows }];

        const existing = termIndexRef.current[`${termIndex}_${variant}`];
        if (existing?.groupRowMap) {
            const newIndices = new Set(rows.map((row) => row.rowIndex));
            const toDelete = Object.entries(existing.groupRowMap)
                .filter(([rowIndex]) => !newIndices.has(Number(rowIndex)))
                .map(([, rowId]) => rowId);
            if (toDelete.length) deleteGroupRowIds = toDelete;
        }
    }

    const currentIndex = termIndexRef.current[`${termIndex}_${variant}`];
    let interview: OcInterviewItem | null = null;

    if (currentIndex?.interviewId) {
        const resp: any = await apiRequest<any>({
            method: "PATCH",
            endpoint: `/api/v1/oc/${ocId}/interviews/${currentIndex.interviewId}`,
            body: {
                semester: termIndex,
                fields,
                groups,
                deleteGroupRowIds,
            },
        });
        interview = parseInterviewResponse(resp);
    } else {
        const existing = await fetchLatestInterviewByTemplate(ocId, match.template.id, termIndex);
        if (existing?.id) {
            const resp: any = await apiRequest<any>({
                method: "PATCH",
                endpoint: `/api/v1/oc/${ocId}/interviews/${existing.id}`,
                body: {
                    semester: termIndex,
                    fields,
                    groups,
                    deleteGroupRowIds,
                },
            });
            interview = parseInterviewResponse(resp);
        } else {
            const resp: any = await apiRequest<any>({
                method: "POST",
                endpoint: `/api/v1/oc/${ocId}/interviews`,
                body: {
                    templateId: match.template.id,
                    semester: termIndex,
                    fields,
                    groups,
                },
            });
            interview = parseInterviewResponse(resp);
        }
    }

    if (!interview) {
        toast.error("Failed to save interview");
        return null;
    }

    const indexKey = `${termIndex}_${variant}`;
    if (variant === "special") {
        const rowMap: Record<number, string> = {};
        const group = interview.groups?.find((g) => g.groupId === match.groupId);
        for (const row of group?.rows ?? []) {
            rowMap[row.rowIndex] = row.id;
        }
        termIndexRef.current[indexKey] = {
            interviewId: interview.id,
            templateId: interview.templateId,
            groupRowMap: rowMap,
        };
    } else {
        termIndexRef.current[indexKey] = {
            interviewId: interview.id,
            templateId: interview.templateId,
        };
    }

    return interview;
}
