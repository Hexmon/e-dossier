"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/app/lib/apiClient";
import type { TemplateField, TemplateGroup, TemplateInfo, TemplateSection } from "@/types/interview-templates";

const templateCache = {
    data: null as TemplateInfo[] | null,
    promise: null as Promise<TemplateInfo[]> | null,
};

function normalizeKey(value: string) {
    return value.trim().toLowerCase();
}

function buildFieldsByKey(fields: TemplateField[]) {
    const map = new Map<string, TemplateField>();
    for (const field of fields) {
        map.set(normalizeKey(field.key), field);
    }
    return map;
}

function buildFieldsById(fields: TemplateField[]) {
    const map = new Map<string, TemplateField>();
    for (const field of fields) {
        map.set(field.id, field);
    }
    return map;
}

function mapField(row: any): TemplateField {
    return {
        id: row.id,
        key: row.key,
        label: row.label,
        fieldType: row.fieldType,
        groupId: row.groupId ?? null,
        required: row.required ?? false,
        helpText: row.helpText ?? null,
        sortOrder: row.sortOrder ?? 0,
        captureFiledAt: row.captureFiledAt ?? false,
        captureSignature: row.captureSignature ?? false,
        options: [],
    };
}

async function loadTemplates(): Promise<TemplateInfo[]> {
    if (templateCache.data) return templateCache.data;
    if (templateCache.promise) return templateCache.promise;

    templateCache.promise = (async () => {
        const resp: any = await apiRequest<any>({
            method: "GET",
            endpoint: "/api/v1/admin/interview/templates",
        });
        const templates: any[] = resp?.items ?? [];

        const detailed = await Promise.all(
            templates.map(async (template) => {
                const [sectionsResp, groupsResp] = await Promise.all([
                    apiRequest<any>({
                        method: "GET",
                        endpoint: `/api/v1/admin/interview/templates/${template.id}/sections`,
                    }),
                    apiRequest<any>({
                        method: "GET",
                        endpoint: `/api/v1/admin/interview/templates/${template.id}/groups`,
                    }),
                ]);

                const sections: any[] = sectionsResp?.items ?? [];
                const groups: any[] = groupsResp?.items ?? [];

                const sectionFieldResponses = await Promise.all(
                    sections.map((section) =>
                        apiRequest<any>({
                            method: "GET",
                            endpoint: `/api/v1/admin/interview/templates/${template.id}/sections/${section.id}/fields`,
                        })
                    )
                );

                const groupFieldResponses = await Promise.all(
                    groups.map((group) =>
                        apiRequest<any>({
                            method: "GET",
                            endpoint: `/api/v1/admin/interview/templates/${template.id}/groups/${group.id}/fields`,
                        })
                    )
                );

                const sectionFieldLists = sectionFieldResponses.map((res) => (res?.items ?? []).map(mapField));
                const sectionRows: TemplateSection[] = sections.map((section, idx) => ({
                    id: section.id,
                    title: section.title,
                    description: section.description ?? null,
                    sortOrder: section.sortOrder ?? 0,
                    fields: sectionFieldLists[idx] ?? [],
                }));

                const groupsDetailed: TemplateGroup[] = groups.map((group, idx) => {
                    const groupFields = (groupFieldResponses[idx]?.items ?? []).map(mapField);
                    return {
                        id: group.id,
                        title: group.title,
                        minRows: group.minRows,
                        maxRows: group.maxRows ?? null,
                        fields: groupFields,
                        fieldsByKey: buildFieldsByKey(groupFields),
                    };
                });

                const allFields = [
                    ...sectionRows.flatMap((section) => section.fields),
                    ...groupsDetailed.flatMap((group) => group.fields),
                ];

                const selectFields = allFields.filter((field) => field.fieldType === "select");
                await Promise.all(
                    selectFields.map(async (field) => {
                        const optionsResp: any = await apiRequest<any>({
                            method: "GET",
                            endpoint: `/api/v1/admin/interview/templates/${template.id}/fields/${field.id}/options`,
                        });
                        field.options = (optionsResp?.items ?? []).map((opt: any) => ({
                            id: opt.id,
                            code: opt.code,
                            label: opt.label,
                            sortOrder: opt.sortOrder ?? 0,
                        }));
                    })
                );

                return {
                    id: template.id,
                    code: template.code,
                    title: template.title,
                    semesters: template.semesters ?? [],
                    allowMultiple: template.allowMultiple ?? true,
                    sections: sectionRows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
                    fieldsByKey: buildFieldsByKey(allFields),
                    fieldsById: buildFieldsById(allFields),
                    groups: groupsDetailed,
                };
            })
        );

        templateCache.data = detailed;
        return detailed;
    })();

    templateCache.promise.catch(() => {
        templateCache.data = null;
        templateCache.promise = null;
    });

    return templateCache.promise;
}

export function useInterviewTemplates() {
    const [templates, setTemplates] = useState<TemplateInfo[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await loadTemplates();
            if (!mountedRef.current) return;
            setTemplates(data);
        } catch (err) {
            if (!mountedRef.current) return;
            setError(err instanceof Error ? err.message : "Failed to load templates");
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
        return () => {
            mountedRef.current = false;
        };
    }, [fetchTemplates]);

    return {
        templates,
        loading,
        error,
        reload: fetchTemplates,
    };
}
