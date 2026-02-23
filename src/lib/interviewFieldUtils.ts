import type { TemplateField, TemplateGroup, TemplateInfo } from "@/types/interview-templates";
import { specialKeyAliases, termKeyAliases } from "@/lib/interviewTemplateMatching";

export type OcInterviewFieldValue = {
    fieldId: string;
    valueText?: string | null;
    valueDate?: string | null;
    valueNumber?: number | null;
    valueBool?: boolean | null;
    valueJson?: unknown | null;
};

export type OcInterviewGroupRow = {
    id: string;
    groupId: string;
    rowIndex: number;
    fields: OcInterviewFieldValue[];
};

export type OcInterviewItem = {
    id: string;
    ocId: string;
    templateId: string;
    semester: number | null;
    course?: string | null;
    createdAt?: string;
    updatedAt?: string;
    fields: OcInterviewFieldValue[];
    groups: Array<{ groupId: string; rows: OcInterviewGroupRow[] }>;
};

export function normalizeKey(value: string) {
    return value.trim().toLowerCase();
}

export function getAliasCandidates(key: string, aliasMap?: Record<string, string[]>) {
    if (!aliasMap) return [];
    const aliases = aliasMap[key] ?? [];
    return aliases.map((alias) => normalizeKey(alias));
}

export function toDateInput(value: string | Date | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
    }
    if (typeof value === "string") {
        return value.slice(0, 10);
    }
    return "";
}

export function readFieldValue(field: TemplateField, value: OcInterviewFieldValue) {
    switch (field.fieldType) {
        case "date":
            return toDateInput(value.valueDate ?? value.valueText ?? null);
        case "number":
            if (value.valueNumber !== undefined && value.valueNumber !== null) return String(value.valueNumber);
            return value.valueText ?? "";
        case "checkbox":
            return value.valueBool ?? false;
        default:
            return value.valueText ?? "";
    }
}

export function buildFieldPayload(field: TemplateField, rawValue: unknown) {
    switch (field.fieldType) {
        case "date": {
            const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
            return { fieldId: field.id, valueDate: value ? value : null };
        }
        case "number": {
            const num = typeof rawValue === "number" ? rawValue : Number(rawValue);
            return { fieldId: field.id, valueNumber: Number.isNaN(num) ? null : num };
        }
        case "checkbox": {
            const boolVal = typeof rawValue === "boolean" ? rawValue : rawValue === "true";
            return { fieldId: field.id, valueBool: boolVal };
        }
        default:
            return { fieldId: field.id, valueText: rawValue === undefined || rawValue === null ? null : String(rawValue) };
    }
}

export function resolveTermField(template: TemplateInfo, baseKey: string) {
    const normalizedKey = normalizeKey(baseKey);
    const direct = template.fieldsByKey.get(normalizedKey);
    if (direct) return direct;

    for (const alias of getAliasCandidates(normalizedKey, termKeyAliases)) {
        const aliasField = template.fieldsByKey.get(alias);
        if (aliasField) return aliasField;
    }

    return null;
}

export function mapTemplateKeyToTermFormKey(termIndex: number, variant: string, templateKey: string) {
    const prefix = `term${termIndex}_${variant}_`;
    if (templateKey.startsWith(prefix)) return templateKey;
    return `${prefix}${templateKey}`;
}

export function resolveSpecialKey(fieldKey: string, target: "date" | "summary" | "interviewedBy") {
    const normalizedTarget = normalizeKey(target);
    const normalizedField = normalizeKey(fieldKey);

    const aliases = specialKeyAliases[normalizedTarget] ?? [normalizedTarget];
    return aliases.map(normalizeKey).includes(normalizedField);
}

export type SpecialGroupFieldMap = {
    date?: TemplateField;
    summary?: TemplateField;
    interviewedBy?: TemplateField;
};

function findFieldByAliases(group: TemplateGroup, aliases: string[]) {
    const normalizedAliases = new Set(aliases.map(normalizeKey));
    return group.fields.find((field) => normalizedAliases.has(normalizeKey(field.key)));
}

function firstUnusedField(
    group: TemplateGroup,
    usedIds: Set<string>,
    predicate: (field: TemplateField) => boolean,
) {
    return group.fields.find((field) => !usedIds.has(field.id) && predicate(field));
}

export function resolveSpecialGroupFieldMap(group: TemplateGroup): SpecialGroupFieldMap {
    const byTarget = {
        date: specialKeyAliases.date ?? ["date"],
        summary: specialKeyAliases.summary ?? ["summary"],
        interviewedBy: specialKeyAliases.interviewedby ?? ["interviewedBy"],
    } as const;

    const usedIds = new Set<string>();
    const out: SpecialGroupFieldMap = {};

    const dateAliasMatch = findFieldByAliases(group, byTarget.date);
    if (dateAliasMatch) {
        out.date = dateAliasMatch;
        usedIds.add(dateAliasMatch.id);
    }

    const summaryAliasMatch = findFieldByAliases(group, byTarget.summary);
    if (summaryAliasMatch && !usedIds.has(summaryAliasMatch.id)) {
        out.summary = summaryAliasMatch;
        usedIds.add(summaryAliasMatch.id);
    }

    const interviewerAliasMatch = findFieldByAliases(group, byTarget.interviewedBy);
    if (interviewerAliasMatch && !usedIds.has(interviewerAliasMatch.id)) {
        out.interviewedBy = interviewerAliasMatch;
        usedIds.add(interviewerAliasMatch.id);
    }

    if (!out.date) {
        const dateField = firstUnusedField(group, usedIds, (field) => normalizeKey(field.fieldType) === "date");
        if (dateField) {
            out.date = dateField;
            usedIds.add(dateField.id);
        }
    }

    if (!out.summary) {
        const summaryField =
            firstUnusedField(group, usedIds, (field) => normalizeKey(field.fieldType) === "textarea") ??
            firstUnusedField(group, usedIds, (field) => ["text", "textarea"].includes(normalizeKey(field.fieldType)));
        if (summaryField) {
            out.summary = summaryField;
            usedIds.add(summaryField.id);
        }
    }

    if (!out.interviewedBy) {
        const interviewerField =
            firstUnusedField(group, usedIds, (field) =>
                ["text", "textarea", "select"].includes(normalizeKey(field.fieldType)),
            ) ?? firstUnusedField(group, usedIds, () => true);
        if (interviewerField) {
            out.interviewedBy = interviewerField;
            usedIds.add(interviewerField.id);
        }
    }

    return out;
}

export function resolveGroupField(group: TemplateGroup, target: "date" | "summary" | "interviewedBy") {
    const mapping = resolveSpecialGroupFieldMap(group);
    return mapping[target] ?? null;
}

export function pickLatestInterview(items: OcInterviewItem[]) {
    if (!items.length) return null;
    return [...items]
        .sort((a, b) => {
            const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
            const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
            return aTime - bTime;
        })
        .pop()!;
}

export function parseInterviewResponse(resp: any) {
    return resp?.interview ?? resp?.item ?? pickLatestInterview(resp?.items ?? []);
}
