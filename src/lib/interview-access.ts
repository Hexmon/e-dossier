import type { TermVariant } from "@/store/slices/termInterviewSlice";
import type { InterviewOfficer } from "@/types/interview";
import type { TemplateField } from "@/types/interview-templates";
import { normalizeAccessToken } from "@/lib/platoon-commander-access";

type TemplateDescriptor = {
    code?: string | null;
    title?: string | null;
};

type InterviewAccessInput = {
    permissions?: Array<string | null | undefined> | null;
    deniedPermissions?: Array<string | null | undefined> | null;
    roles?: Array<string | null | undefined> | null;
    position?: string | null;
    scopeType?: string | null;
};

type OfficerAliasKey = InterviewOfficer | "commander";
type ResolvedTemplateScope =
    | { category: "initial"; officer: InterviewOfficer }
    | { category: "term"; variant: TermVariant };
type TermFieldOwner = InterviewOfficer | "shared" | "global";

export const INTERVIEW_WRITE_PERMISSIONS = {
    initial: {
        plcdr: "oc:interviews:initial:plcdr:update",
        dscoord: "oc:interviews:initial:dscoord:update",
        dycdr: "oc:interviews:initial:dycdr:update",
        cdr: "oc:interviews:initial:cdr:update",
    },
    term: {
        beginning: {
            shared: "oc:interviews:term:beginning:shared:update",
            plcdr: "oc:interviews:term:beginning:plcdr:update",
            dscoord: "oc:interviews:term:beginning:dscoord:update",
            dycdr: "oc:interviews:term:beginning:dycdr:update",
            cdr: "oc:interviews:term:beginning:cdr:update",
        },
        postmid: "oc:interviews:term:postmid:update",
        special: "oc:interviews:special:update",
    },
} as const;

export const INTERVIEW_WRITE_PERMISSION_KEYS = Array.from(
    new Set([
        ...Object.values(INTERVIEW_WRITE_PERMISSIONS.initial),
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.shared,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.dscoord,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.dycdr,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.cdr,
        INTERVIEW_WRITE_PERMISSIONS.term.postmid,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
    ]),
).sort();

export const INTERVIEW_DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    admin: INTERVIEW_WRITE_PERMISSION_KEYS,
    super_admin: INTERVIEW_WRITE_PERMISSION_KEYS,
    platoon_commander: [
        INTERVIEW_WRITE_PERMISSIONS.initial.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.shared,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.postmid,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
    ],
    platoon_commander_equivalent: [
        INTERVIEW_WRITE_PERMISSIONS.initial.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.shared,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.postmid,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
    ],
    pl_cdr: [
        INTERVIEW_WRITE_PERMISSIONS.initial.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.shared,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.postmid,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
    ],
    plcdr: [
        INTERVIEW_WRITE_PERMISSIONS.initial.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.shared,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.postmid,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
    ],
    ptn_cdr: [
        INTERVIEW_WRITE_PERMISSIONS.initial.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.shared,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.plcdr,
        INTERVIEW_WRITE_PERMISSIONS.term.postmid,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
    ],
    ds_coord: [
        INTERVIEW_WRITE_PERMISSIONS.initial.dscoord,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.dscoord,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
    ],
    dscoord: [
        INTERVIEW_WRITE_PERMISSIONS.initial.dscoord,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.dscoord,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
    ],
    dcci: [
        INTERVIEW_WRITE_PERMISSIONS.initial.dycdr,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.dycdr,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
    ],
    dy_cdr: [
        INTERVIEW_WRITE_PERMISSIONS.initial.dycdr,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.dycdr,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
    ],
    dycdr: [
        INTERVIEW_WRITE_PERMISSIONS.initial.dycdr,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.dycdr,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
    ],
    cdr: [
        INTERVIEW_WRITE_PERMISSIONS.initial.cdr,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.cdr,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
    ],
    commander: [
        INTERVIEW_WRITE_PERMISSIONS.initial.cdr,
        INTERVIEW_WRITE_PERMISSIONS.term.beginning.cdr,
        INTERVIEW_WRITE_PERMISSIONS.term.special,
    ],
};

export type InterviewAccessContext = {
    permissions: Set<string>;
    deniedPermissions: Set<string>;
};

const officerAliases: Record<OfficerAliasKey, string[]> = {
    plcdr: ["PLCDR", "PL_CDR", "PLATOON_COMMANDER", "PLATOON_CDR", "PTN_CDR"],
    dscoord: ["DSCOORD", "DS_COORD", "DS_COORDINATOR", "DEPUTY_SECRETARY_COORDINATOR"],
    dycdr: ["DYCDR", "DY_CDR", "DCCI", "DEPUTY_COMMANDANT", "DEPUTY_COMMANDER", "DY_COMDT"],
    cdr: ["CDR"],
    commander: ["COMMANDER", "COMMANDING_OFFICER"],
};

const initialKeywords = ["INITIAL"];
const termKeywords = {
    beginning: ["BEGINNING_OF_TERM", "BEGINNING", "BOT"],
    postmid: ["POSTMID", "POST_MID", "POST_MID_TERM", "MID_TERM", "MIDTERM"],
    special: ["SPECIAL"],
} as const;

const termBeginningDiscriminatorKeys = ["REMARKS1", "REMARKSNAME1", "REMARKS2", "REMARKSNAME2", "REMARKS3", "REMARKSNAME3"];
const termPostmidDiscriminatorKeys = ["INTERVIEWEDBY", "INTERVIEWER", "INTERVIEWEDBYNAME", "INTERVIEWED_BY"];
const specialFieldKeys = {
    summary: ["SUMMARY", "DETAILS", "REMARKS", "INTERVIEWSUMMARY", "INTERVIEW_SUMMARY"],
    interviewedBy: ["INTERVIEWEDBY", "INTERVIEWER", "INTERVIEWED_BY", "INTERVIEWEDBYNAME"],
};

function collectPermissions(input: Array<string | null | undefined> | null | undefined) {
    const tokens = new Set<string>();
    for (const permission of input ?? []) {
        const token = typeof permission === "string" ? permission.trim() : "";
        if (token) tokens.add(token);
    }
    return tokens;
}

function normalizeRoleKey(value: string | null | undefined) {
    return normalizeAccessToken(value).toLowerCase();
}

function addPermissions(target: Set<string>, permissions: Iterable<string>) {
    for (const permission of permissions) {
        if (permission) target.add(permission);
    }
}

function grantsOfficerByDynamicToken(roleKey: string, scopeType: string, officer: InterviewOfficer) {
    if (!roleKey) return false;

    if (officer === "plcdr") {
        return (
            roleKey === "platoon_commander" ||
            roleKey === "platoon_commander_equivalent" ||
            roleKey === "pl_cdr" ||
            roleKey === "platoon_cdr" ||
            roleKey === "ptn_cdr" ||
            roleKey === "plcdr" ||
            roleKey.endsWith("plcdr") ||
            (scopeType === "platoon" && roleKey.includes("plcdr"))
        );
    }

    if (officer === "dscoord") {
        return roleKey === "ds_coord" || roleKey === "dscoord" || roleKey.endsWith("dscoord");
    }

    if (officer === "dycdr") {
        return (
            roleKey === "dcci" ||
            roleKey === "dy_cdr" ||
            roleKey === "dycdr" ||
            roleKey.endsWith("dycdr") ||
            roleKey.endsWith("dcci")
        );
    }

    return roleKey === "cdr" || roleKey === "commander" || roleKey === "commanding_officer";
}

function collectRoleKeys(input: InterviewAccessInput) {
    const roleKeys = new Set<string>();

    for (const role of input.roles ?? []) {
        const key = normalizeRoleKey(role);
        if (key) roleKeys.add(key);
    }

    const positionKey = normalizeRoleKey(input.position);
    if (positionKey) roleKeys.add(positionKey);

    return roleKeys;
}

export function resolveInterviewFallbackPermissionKeys(input: InterviewAccessInput) {
    const permissions = new Set<string>();
    const roleKeys = collectRoleKeys(input);
    const scopeType = normalizeRoleKey(input.scopeType);

    for (const roleKey of roleKeys) {
        addPermissions(permissions, INTERVIEW_DEFAULT_ROLE_PERMISSIONS[roleKey] ?? []);
    }

    for (const roleKey of roleKeys) {
        if (grantsOfficerByDynamicToken(roleKey, scopeType, "plcdr")) {
            addPermissions(permissions, INTERVIEW_DEFAULT_ROLE_PERMISSIONS.plcdr);
        }
        if (grantsOfficerByDynamicToken(roleKey, scopeType, "dscoord")) {
            addPermissions(permissions, INTERVIEW_DEFAULT_ROLE_PERMISSIONS.dscoord);
        }
        if (grantsOfficerByDynamicToken(roleKey, scopeType, "dycdr")) {
            addPermissions(permissions, INTERVIEW_DEFAULT_ROLE_PERMISSIONS.dycdr);
        }
        if (grantsOfficerByDynamicToken(roleKey, scopeType, "cdr")) {
            addPermissions(permissions, INTERVIEW_DEFAULT_ROLE_PERMISSIONS.cdr);
        }
    }

    return Array.from(permissions).sort();
}

function collectFallbackPermissions(input: InterviewAccessInput) {
    return new Set(resolveInterviewFallbackPermissionKeys(input));
}

function normalizeFieldText(value: string | null | undefined) {
    return normalizeAccessToken(value).replace(/_/g, "");
}

function fieldContainsAny(field: Pick<TemplateField, "key" | "label">, patterns: string[]) {
    const haystack = `${normalizeFieldText(field.key)} ${normalizeFieldText(field.label)}`.trim();
    return patterns.some((pattern) => haystack.includes(pattern));
}

function normalizeFieldKeys(fields: Iterable<Pick<TemplateField, "key">>) {
    return new Set(Array.from(fields, (field) => normalizeAccessToken(field.key)));
}

function templateText(template: TemplateDescriptor) {
    return normalizeAccessToken(`${template.code ?? ""} ${template.title ?? ""}`);
}

function includesAnyToken(text: string, patterns: readonly string[]) {
    return patterns.some((pattern) => text.includes(pattern));
}

function scoreInitialOfficer(text: string, officer: InterviewOfficer) {
    const officerPatterns = officer === "cdr"
        ? [...officerAliases.cdr, ...officerAliases.commander]
        : officerAliases[officer];
    return officerPatterns.reduce((score, pattern) => (text.includes(pattern) ? score + 1 : score), 0);
}

function resolveInitialOfficerFromTemplate(template: TemplateDescriptor) {
    const text = templateText(template);
    if (!includesAnyToken(text, initialKeywords)) return null;

    const scores = (["plcdr", "dscoord", "dycdr", "cdr"] as const).map((officer) => ({
        officer,
        score: scoreInitialOfficer(text, officer),
    }));
    scores.sort((left, right) => right.score - left.score);

    return scores[0]?.score ? scores[0].officer : null;
}

function resolveOfficerByFieldAlias(field: Pick<TemplateField, "key" | "label">): InterviewOfficer | null {
    if (fieldContainsAny(field, ["REMARKS1", "REMARKSNAME1"])) return "plcdr";
    if (fieldContainsAny(field, ["REMARKS2", "REMARKSNAME2"])) return "dycdr";
    if (fieldContainsAny(field, ["REMARKS3", "REMARKSNAME3"])) return "cdr";

    if (fieldContainsAny(field, officerAliases.plcdr.map((alias) => alias.replace(/_/g, "")))) return "plcdr";
    if (fieldContainsAny(field, officerAliases.dscoord.map((alias) => alias.replace(/_/g, "")))) return "dscoord";
    if (fieldContainsAny(field, officerAliases.dycdr.map((alias) => alias.replace(/_/g, "")))) return "dycdr";

    const cdrPatterns = [...officerAliases.cdr, ...officerAliases.commander]
        .map((alias) => alias.replace(/_/g, ""))
        .filter((alias) => !["PLCDR", "DYCDR", "DSCOORD"].includes(alias));
    if (fieldContainsAny(field, cdrPatterns)) return "cdr";

    return null;
}

function resolveTermVariantFromTemplate(
    template: TemplateDescriptor,
    fields: Iterable<Pick<TemplateField, "key" | "groupId">>,
): TermVariant | null {
    const text = templateText(template);
    const keys = normalizeFieldKeys(fields);
    const groupedFields = Array.from(fields).filter((field) => field.groupId);
    const groupedKeys = normalizeFieldKeys(groupedFields);

    const isSpecial =
        includesAnyToken(text, termKeywords.special) ||
        (groupedFields.length > 0 &&
            Array.from(groupedKeys).some((key) => specialFieldKeys.summary.includes(key)) &&
            Array.from(groupedKeys).some((key) => specialFieldKeys.interviewedBy.includes(key)));
    if (isSpecial) return "special";

    if (
        includesAnyToken(text, termKeywords.beginning) ||
        termBeginningDiscriminatorKeys.some((key) => keys.has(key))
    ) {
        return "beginning";
    }

    if (
        includesAnyToken(text, termKeywords.postmid) ||
        termPostmidDiscriminatorKeys.some((key) => keys.has(key))
    ) {
        return "postmid";
    }

    return null;
}

function hasPermission(context: InterviewAccessContext, permission: string) {
    if (context.deniedPermissions.has(permission)) return false;
    return context.permissions.has("*") || context.permissions.has(permission);
}

export function resolveInterviewAccessContext(input: InterviewAccessInput): InterviewAccessContext {
    const explicitPermissions = collectPermissions(input.permissions);
    return {
        permissions: explicitPermissions.size > 0 ? explicitPermissions : collectFallbackPermissions(input),
        deniedPermissions: collectPermissions(input.deniedPermissions),
    };
}

export function canEditInitialInterviewOfficer(context: InterviewAccessContext, officer: InterviewOfficer) {
    return hasPermission(context, INTERVIEW_WRITE_PERMISSIONS.initial[officer]);
}

export function resolveTermFieldOwner(
    field: Pick<TemplateField, "key" | "label">,
    variant: Exclude<TermVariant, "special">,
): TermFieldOwner {
    if (variant === "postmid") {
        return "shared";
    }

    return resolveOfficerByFieldAlias(field) ?? "shared";
}

export function getRequiredPermissionForTermField(
    variant: TermVariant,
    field: Pick<TemplateField, "key" | "label">,
) {
    if (variant === "special") return INTERVIEW_WRITE_PERMISSIONS.term.special;
    if (variant === "postmid") return INTERVIEW_WRITE_PERMISSIONS.term.postmid;

    const owner = resolveTermFieldOwner(field, "beginning");
    if (owner === "shared") return INTERVIEW_WRITE_PERMISSIONS.term.beginning.shared;
    if (owner === "global") return INTERVIEW_WRITE_PERMISSIONS.term.special;
    return INTERVIEW_WRITE_PERMISSIONS.term.beginning[owner];
}

export function canEditTermField(
    context: InterviewAccessContext,
    variant: TermVariant,
    field: Pick<TemplateField, "key" | "label">,
) {
    return hasPermission(context, getRequiredPermissionForTermField(variant, field));
}

export function canEditAnyTermFields(
    context: InterviewAccessContext,
    variant: TermVariant,
    fields: Iterable<Pick<TemplateField, "key" | "label">>,
) {
    for (const field of fields) {
        if (canEditTermField(context, variant, field)) {
            return true;
        }
    }

    return false;
}

export function isTermIdentityField(
    field: Pick<TemplateField, "key" | "label" | "fieldType" | "captureSignature">,
    variant: Exclude<TermVariant, "special">,
) {
    const normalizedKey = normalizeFieldText(field.key);
    if (variant === "beginning" && ["REMARKSNAME1", "REMARKSNAME2", "REMARKSNAME3"].includes(normalizedKey)) {
        return true;
    }

    const type = normalizeAccessToken(field.fieldType);
    if (type === "SIGNATURE" || field.captureSignature) return true;

    return fieldContainsAny(field, ["INTERVIEWEDBY", "INTERVIEWER", "SIGNEDBY", "SIGNATURE", "SIGNATORY"]);
}

export function resolveInterviewTemplateScope(
    template: TemplateDescriptor,
    fields: Iterable<Pick<TemplateField, "key" | "label" | "groupId">>,
): ResolvedTemplateScope | null {
    const initialOfficer = resolveInitialOfficerFromTemplate(template);
    if (initialOfficer) {
        return { category: "initial", officer: initialOfficer };
    }

    const termVariant = resolveTermVariantFromTemplate(template, fields);
    if (termVariant) {
        return { category: "term", variant: termVariant };
    }

    return null;
}

export function getRequiredPermissionsForInterviewMutation(params: {
    template: TemplateDescriptor;
    fields: Array<Pick<TemplateField, "key" | "label" | "groupId">>;
}) {
    const scope = resolveInterviewTemplateScope(params.template, params.fields);
    if (!scope) return [];

    if (scope.category === "initial") {
        return [INTERVIEW_WRITE_PERMISSIONS.initial[scope.officer]];
    }

    if (scope.variant === "special") {
        return [INTERVIEW_WRITE_PERMISSIONS.term.special];
    }

    return Array.from(
        new Set(params.fields.map((field) => getRequiredPermissionForTermField(scope.variant, field))),
    ).sort();
}

export function canMutateInterviewTemplate(
    context: InterviewAccessContext,
    params: {
        template: TemplateDescriptor;
        fields: Array<Pick<TemplateField, "key" | "label" | "groupId">>;
    },
) {
    const permissions = getRequiredPermissionsForInterviewMutation(params);
    if (permissions.length === 0) return false;
    return permissions.every((permission) => hasPermission(context, permission));
}
