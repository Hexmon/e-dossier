import { apiRequest } from "@/app/lib/apiClient";
import type { TemplateField, TemplateGroup, TemplateInfo, TemplateSection } from "@/types/interview-templates";

const templateCache = {
    data: null as TemplateInfo[] | null,
    promise: null as Promise<TemplateInfo[]> | null,
};

export function clearInterviewTemplateCache() {
    templateCache.data = null;
    templateCache.promise = null;
}

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

function mapFieldWithOptions(row: any): TemplateField {
    return {
        ...mapField(row),
        options: (row.options ?? []).map((option: any) => ({
            id: option.id,
            code: option.code,
            label: option.label,
            sortOrder: option.sortOrder ?? 0,
        })),
    };
}

function sortFields(fields: TemplateField[]) {
    return [...fields].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function sortSections(sections: TemplateSection[]) {
    return [...sections].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function loadInterviewTemplates(): Promise<TemplateInfo[]> {
    if (templateCache.data) return templateCache.data;
    if (templateCache.promise) return templateCache.promise;

    templateCache.promise = (async () => {
        const resp: any = await apiRequest<any>({
            method: "GET",
            endpoint: "/api/v1/admin/interview/templates?hydrate=true",
        });
        const templates: any[] = resp?.items ?? [];

        const detailed = templates.map((template) => {
            const sectionRows: TemplateSection[] = sortSections(
                (template.sections ?? []).map((section: any) => {
                    const sectionFields = sortFields((section.fields ?? []).map(mapFieldWithOptions));
                    return {
                        id: section.id,
                        title: section.title,
                        description: section.description ?? null,
                        sortOrder: section.sortOrder ?? 0,
                        fields: sectionFields,
                    };
                })
            );

            const groupsDetailed: TemplateGroup[] = (template.groups ?? []).map((group: any) => {
                const groupFields = sortFields((group.fields ?? []).map(mapFieldWithOptions));
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

            return {
                id: template.id,
                code: template.code,
                title: template.title,
                sortOrder: template.sortOrder ?? 0,
                semesters: template.semesters ?? [],
                allowMultiple: template.allowMultiple ?? true,
                sections: sectionRows,
                fieldsByKey: buildFieldsByKey(allFields),
                fieldsById: buildFieldsById(allFields),
                groups: groupsDetailed,
            };
        });

        templateCache.data = detailed;
        return detailed;
    })();

    templateCache.promise.catch((err) => {
        templateCache.data = null;
        templateCache.promise = null;
        console.error("Failed to load interview templates:", err);
    });

    return templateCache.promise;
}
