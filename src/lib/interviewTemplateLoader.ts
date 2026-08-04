import { apiRequest } from "@/app/lib/apiClient";
import type { TemplateField, TemplateGroup, TemplateInfo, TemplateSection } from "@/types/interview-templates";

type TemplateCacheEntry = {
    data: TemplateInfo[] | null;
    promise: Promise<TemplateInfo[]> | null;
};

const templateCache = new Map<string, TemplateCacheEntry>();

function cacheKey(courseId?: string | null) {
    return courseId?.trim() || "__global__";
}

export function clearInterviewTemplateCache(courseId?: string | null) {
    if (courseId === undefined) {
        templateCache.clear();
        return;
    }
    templateCache.delete(cacheKey(courseId));
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

export async function loadInterviewTemplates(courseId?: string | null): Promise<TemplateInfo[]> {
    const key = cacheKey(courseId);
    const cached = templateCache.get(key) ?? { data: null, promise: null };
    templateCache.set(key, cached);

    if (cached.data) return cached.data;
    if (cached.promise) return cached.promise;

    cached.promise = (async () => {
        const params = new URLSearchParams({ hydrate: "true" });
        if (courseId?.trim()) {
            params.set("courseId", courseId.trim());
            params.set("fallbackToLegacyGlobal", "true");
        }
        const resp: any = await apiRequest<any>({
            method: "GET",
            endpoint: `/api/v1/admin/interview/templates?${params.toString()}`,
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

        cached.data = detailed;
        return detailed;
    })();

    cached.promise.catch((err) => {
        cached.data = null;
        cached.promise = null;
        console.error("Failed to load interview templates:", err);
    });

    return cached.promise;
}
