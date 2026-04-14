import type { SpecialInterviewRecord } from "@/store/slices/termInterviewSlice";
import type { TemplateField } from "@/types/interview-templates";

type TemplateFieldLike = Pick<TemplateField, "key" | "label" | "fieldType" | "groupId" | "captureSignature">;
type TermActorAutofillVariant = "beginning" | "postmid";

const INTERVIEW_ACTOR_ALIASES = [
    "interviewed by",
    "interviewer",
    "interviewed_by",
    "interviewedby",
    "interviewedbyname",
    "signature",
    "signatory",
    "signed by",
].map(normalizeText);
const TERM_REMARK_NAME_KEYS = new Set(["remarksname1", "remarksname2", "remarksname3"]);
const TERM_OFFICER_TEXTAREA_ALIASES = {
    plcdr: ["pl cdr", "plcdr", "pl cdr remarks", "plcdr remarks", "platoon cdr", "platoon commander"],
} as const;

function normalizeText(value: string | null | undefined) {
    return (value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function isBlank(value: unknown) {
    return value === "" || value === null || value === undefined;
}

function isTextLikeField(field: TemplateFieldLike) {
    const type = normalizeText(field.fieldType);
    return type === "text" || type === "textarea" || type === "signature";
}

function isTextareaField(field: TemplateFieldLike) {
    return normalizeText(field.fieldType) === "textarea";
}

function shouldAutofillInterviewActor(field: TemplateFieldLike) {
    if (!isTextLikeField(field)) return false;
    if (field.captureSignature) return true;
    if (normalizeText(field.fieldType) === "signature") return true;

    const haystack = `${normalizeText(field.key)} ${normalizeText(field.label)}`.trim();
    return INTERVIEW_ACTOR_ALIASES.some((alias) => haystack.includes(alias));
}

function findOfficerTextareaField(fields: TemplateFieldLike[], aliases: readonly string[]) {
    const normalizedAliases = aliases.map(normalizeText);
    return (
        fields.find((field) => {
            if (!isTextareaField(field)) return false;
            const haystack = `${normalizeText(field.key)} ${normalizeText(field.label)}`.trim();
            return normalizedAliases.some((alias) => haystack.includes(alias));
        }) ?? null
    );
}

export function buildInterviewActorDisplayName(input?: { rank?: string | null; name?: string | null }) {
    const rank = (input?.rank ?? "").trim();
    const name = (input?.name ?? "").trim();
    return [rank, name].filter(Boolean).join(" ").trim();
}

export function resolveTermActorAutofillFields(
    fields: Iterable<TemplateFieldLike>,
    variant: TermActorAutofillVariant,
) {
    const topLevelFields = Array.from(fields).filter((field) => !field.groupId);

    if (variant === "postmid") {
        const plcdrField = findOfficerTextareaField(topLevelFields, TERM_OFFICER_TEXTAREA_ALIASES.plcdr);
        if (plcdrField) {
            return [{ ...plcdrField, captureSignature: true }];
        }
    }

    return topLevelFields.filter((field) => {
        const normalizedKey = normalizeText(field.key).replace(/ /g, "");
        if (variant === "beginning" && TERM_REMARK_NAME_KEYS.has(normalizedKey)) {
            return true;
        }

        return shouldAutofillInterviewActor(field);
    });
}

export function applyInterviewActorAutofill<T extends Record<string, unknown>>(params: {
    values: T;
    templateFields?: Iterable<TemplateFieldLike>;
    actorDisplayName?: string | null;
    resolveFieldKey?: (field: TemplateFieldLike) => string;
}) {
    const actorDisplayName = (params.actorDisplayName ?? "").trim();
    if (!actorDisplayName) {
        return { ...params.values };
    }

    const nextValues = { ...params.values };

    for (const field of params.templateFields ?? []) {
        if (field.groupId) continue;
        if (!shouldAutofillInterviewActor(field)) continue;

        const targetKey = params.resolveFieldKey ? params.resolveFieldKey(field) : field.key;
        if (isBlank(nextValues[targetKey])) {
            (nextValues as Record<string, unknown>)[targetKey] = actorDisplayName;
        }
    }

    return nextValues;
}

export function applySpecialInterviewActorAutofill(
    records: SpecialInterviewRecord[],
    actorDisplayName?: string | null,
) {
    const normalizedActor = (actorDisplayName ?? "").trim();
    return records.map((record) => ({
        ...record,
        interviewedBy: isBlank(record.interviewedBy) && normalizedActor ? normalizedActor : (record.interviewedBy ?? ""),
    }));
}

export function createDefaultSpecialInterviewRecord(rowIndex: number, actorDisplayName?: string | null): SpecialInterviewRecord {
    return {
        date: "",
        summary: "",
        interviewedBy: (actorDisplayName ?? "").trim(),
        rowIndex,
    };
}
