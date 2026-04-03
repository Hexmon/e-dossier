import type { MeResponse } from "@/app/lib/api/me";
import type { TemplateField } from "@/types/interview-templates";

type SignatureUser = {
    rank?: string | null;
    name?: string | null;
};

type SignatureFieldLike = {
    key: string;
    fieldType?: string | null;
    captureSignature?: boolean;
    groupId?: string | null;
};

export function formatUserRankAndName(user?: SignatureUser | null) {
    const rank = user?.rank?.trim() ?? "";
    const name = user?.name?.trim() ?? "";
    return [rank, name].filter(Boolean).join(" ");
}

export function getCurrentUserSignature(meData?: Pick<MeResponse, "user"> | null) {
    return formatUserRankAndName(meData?.user);
}

export function isSignatureTemplateField(field?: SignatureFieldLike | null) {
    if (!field) return false;
    const fieldType = field.fieldType?.trim().toLowerCase() ?? "";
    return fieldType === "signature" || field.captureSignature === true;
}

export function hasMeaningfulSignatureValue(value: unknown) {
    return typeof value === "string" ? value.trim().length > 0 : false;
}

export function applySignatureDefaults<T extends Record<string, unknown>>(params: {
    values: T;
    fields?: SignatureFieldLike[];
    signatureValue?: string;
    resolveKey?: (field: SignatureFieldLike) => string;
    includeGroupedFields?: boolean;
}) {
    const signatureValue = params.signatureValue?.trim() ?? "";
    if (!signatureValue) return { ...params.values };

    const out = { ...params.values };
    for (const field of params.fields ?? []) {
        if (!params.includeGroupedFields && field.groupId) continue;
        if (!isSignatureTemplateField(field)) continue;

        const key = params.resolveKey ? params.resolveKey(field) : field.key;
        if (!hasMeaningfulSignatureValue(out[key])) {
            out[key as keyof T] = signatureValue as T[keyof T];
        }
    }

    return out;
}
