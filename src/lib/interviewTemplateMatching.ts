import { InterviewOfficer } from "@/types/interview";
import { TermVariant } from "@/store/slices/termInterviewSlice";
import type { TemplateInfo } from "@/types/interview-templates";

export type TemplateMatch = {
    template: TemplateInfo;
    groupId?: string;
    score: number;
};

export type InterviewTemplateKind = InterviewOfficer | TermVariant;

type SemesterTemplateMap = Record<number, TemplateMatch | null>;

export type TemplateMappings = {
    byKind: Record<string, TemplateMatch | null>;
    byKindSemester: Record<string, SemesterTemplateMap>;
    byTemplateId: Map<string, { kind: string; groupId?: string }>;
};

export const termKeyConfig: Record<TermVariant, { keys: string[]; prefersSemester: boolean }> = {
    beginning: {
        keys: [
            "date",
            "strengths",
            "weakness",
            "proficiency",
            "performanceAppraisal",
            "remarks1",
            "remarksName1",
            "remarks2",
            "remarksName2",
            "remarks3",
            "remarksName3",
        ],
        prefersSemester: true,
    },
    postmid: {
        keys: ["date", "strengths", "weakness", "proficiency", "performanceAppraisal", "interviewedBy"],
        prefersSemester: true,
    },
    special: {
        keys: ["date", "summary", "interviewedBy"],
        prefersSemester: true,
    },
};

export const termKeyAliases: Record<string, string[]> = {
    date: ["date", "interviewdate", "interview_date"],
    interviewedby: ["interviewedby", "interviewer", "interviewed_by", "interviewedbyname"],
    performanceappraisal: ["performanceappraisal", "performance_appraisal", "appraisal"],
    summary: ["summary", "details", "remarks", "interviewsummary", "interview_summary"],
};

export const specialKeyAliases: Record<string, string[]> = {
    date: ["date", "interviewdate", "interview_date"],
    summary: ["summary", "details", "remarks", "interviewsummary", "interview_summary"],
    interviewedby: ["interviewedby", "interviewer", "interviewed_by", "interviewedbyname"],
};

const officerKeywords: Record<InterviewOfficer, string[]> = {
    plcdr: ["plcdr", "pl cdr", "platoon cdr", "platoon commander", "platoon"],
    dscoord: ["ds coord", "dscoord", "ds coordinator"],
    dycdr: ["dy cdr", "dycdr", "deputy cdr", "deputy commander"],
    cdr: ["cdr", "commander", "commanding officer"],
};

const termKeywords: Record<TermVariant, string[]> = {
    beginning: ["beginning", "beginning of term", "bot"],
    postmid: ["post mid", "postmid", "mid term", "midterm"],
    special: ["special"],
};

const termVariantDiscriminatorKeys: Record<Exclude<TermVariant, "special">, string[]> = {
    beginning: ["remarks1", "remarksname1", "remarks2", "remarksname2", "remarks3", "remarksname3"],
    postmid: ["interviewedby", "interviewer", "interviewed_by", "interviewedbyname"],
};

function normalizeKey(value: string) {
    return value.trim().toLowerCase();
}

function normalizeText(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function countMatches(text: string, keywords: string[]) {
    return keywords.reduce((count, keyword) => (text.includes(keyword) ? count + 1 : count), 0);
}

function templateText(template: TemplateInfo) {
    return normalizeText(`${template.code ?? ""} ${template.title ?? ""}`);
}

function scoreInitialTemplate(template: TemplateInfo, officer: InterviewOfficer) {
    const text = templateText(template);
    let score = countMatches(text, officerKeywords[officer]) * 3;

    if (text.includes("initial")) score += 2;
    if (text.includes("term")) score -= 2;
    if ((template.semesters?.length ?? 0) > 0) score -= 1;

    for (const other of Object.keys(officerKeywords) as InterviewOfficer[]) {
        if (other === officer) continue;
        score -= countMatches(text, officerKeywords[other]);
    }

    // Prevent generic "cdr"/"commander" matches from hijacking PL CDR / DY CDR / DS COORD templates.
    if (officer === "cdr") {
        const hasOtherOfficerSignal = (["plcdr", "dscoord", "dycdr"] as InterviewOfficer[]).some(
            (other) => countMatches(text, officerKeywords[other]) > 0,
        );
        if (hasOtherOfficerSignal) {
            score -= 100;
        }
    }

    return score;
}

function scoreTermTemplate(template: TemplateInfo, variant: TermVariant) {
    const text = templateText(template);
    let score = countMatches(text, termKeywords[variant]) * 3;

    if (text.includes("term")) score += 1;
    if (text.includes("initial")) score -= 2;
    if ((template.semesters?.length ?? 0) > 0) score += 1;
    if (variant === "special" && template.groups.length) score += 1;

    return score;
}

function selectBestTemplateByScore(templates: TemplateInfo[], scorer: (template: TemplateInfo) => number) {
    let best: TemplateMatch | null = null;
    for (const template of templates) {
        const score = scorer(template);
        if (score <= 0) continue;
        if (!best || score > best.score) {
            best = { template, score };
        }
    }
    return best;
}

function splitTemplatesForSemester(templates: TemplateInfo[], semester: number) {
    const exact = templates.filter((template) => (template.semesters ?? []).includes(semester));
    const generic = templates.filter((template) => (template.semesters?.length ?? 0) === 0);
    return { exact, generic };
}

function getAliasCandidates(key: string, aliasMap?: Record<string, string[]>) {
    if (!aliasMap) return [];
    const aliases = aliasMap[key] ?? [];
    return aliases.map((alias) => normalizeKey(alias));
}

function getTemplateFields(template: TemplateInfo) {
    return template.sections.flatMap((section) => section.fields);
}

function getNormalizedTemplateFieldKeys(template: TemplateInfo) {
    return new Set(getTemplateFields(template).map((field) => normalizeKey(field.key)));
}

function hasTermVariantTextSignal(template: TemplateInfo, variant: Exclude<TermVariant, "special">) {
    const text = templateText(template);
    return termKeywords[variant].some((keyword) => text.includes(keyword));
}

function hasTermVariantDiscriminatorKey(template: TemplateInfo, variant: Exclude<TermVariant, "special">) {
    const keys = getNormalizedTemplateFieldKeys(template);
    return termVariantDiscriminatorKeys[variant].some((key) => keys.has(normalizeKey(key)));
}

function isTermTemplateCandidate(template: TemplateInfo, variant: Exclude<TermVariant, "special">) {
    return hasTermVariantTextSignal(template, variant) || hasTermVariantDiscriminatorKey(template, variant);
}

function scoreTemplateMatch(
    template: TemplateInfo,
    expectedKeys: string[],
    opts?: { aliasMap?: Record<string, string[]>; prefersSemester?: boolean },
) {
    const keys = new Set(getTemplateFields(template).map((field) => normalizeKey(field.key)));
    let matches = 0;

    for (const key of expectedKeys) {
        const normalized = normalizeKey(key);
        const candidates = new Set<string>([normalized]);

        for (const alias of getAliasCandidates(normalized, opts?.aliasMap)) {
            candidates.add(alias);
        }

        if ([...candidates].some((candidate) => keys.has(candidate))) {
            matches += 1;
        }
    }

    let score = matches;
    if (opts?.prefersSemester && (template.semesters?.length ?? 0) > 0) {
        score += 0.5;
    }

    return { matches, score };
}

function selectBestTemplate(
    templates: TemplateInfo[],
    expectedKeys: string[],
    opts?: { aliasMap?: Record<string, string[]>; prefersSemester?: boolean },
) {
    const minMatches = Math.max(2, Math.ceil(expectedKeys.length * 0.3));
    let best: TemplateMatch | null = null;

    for (const template of templates) {
        const { matches, score } = scoreTemplateMatch(template, expectedKeys, opts);
        if (matches < minMatches) continue;
        if (!best || score > best.score) {
            best = { template, score };
        }
    }

    return best;
}

function selectBestGroupTemplate(
    templates: TemplateInfo[],
    expectedKeys: string[],
    opts?: { aliasMap?: Record<string, string[]>; prefersSemester?: boolean },
) {
    const minMatches = Math.max(2, Math.ceil(expectedKeys.length * 0.3));
    let best: TemplateMatch | null = null;

    for (const template of templates) {
        for (const group of template.groups) {
            const keys = new Set(group.fields.map((field) => normalizeKey(field.key)));
            let matches = 0;

            for (const key of expectedKeys) {
                const normalized = normalizeKey(key);
                const candidates = new Set<string>([normalized]);

                for (const alias of getAliasCandidates(normalized, opts?.aliasMap)) {
                    candidates.add(alias);
                }

                if ([...candidates].some((candidate) => keys.has(candidate))) {
                    matches += 1;
                }
            }

            if (matches < minMatches) continue;

            let score = matches;
            if (opts?.prefersSemester && (template.semesters?.length ?? 0) > 0) {
                score += 0.5;
            }

            if (!best || score > best.score) {
                best = { template, groupId: group.id, score };
            }
        }
    }

    return best;
}

function selectBestGroupInTemplate(
    template: TemplateInfo,
    expectedKeys: string[],
    opts?: { aliasMap?: Record<string, string[]> },
) {
    const minMatches = Math.max(2, Math.ceil(expectedKeys.length * 0.3));
    let best: { groupId: string; score: number } | null = null;

    for (const group of template.groups) {
        const keys = new Set(group.fields.map((field) => normalizeKey(field.key)));
        let matches = 0;

        for (const key of expectedKeys) {
            const normalized = normalizeKey(key);
            const candidates = new Set<string>([normalized]);

            for (const alias of getAliasCandidates(normalized, opts?.aliasMap)) {
                candidates.add(alias);
            }

            if ([...candidates].some((candidate) => keys.has(candidate))) {
                matches += 1;
            }
        }

        if (matches < minMatches) continue;
        const score = matches;
        if (!best || score > best.score) {
            best = { groupId: group.id, score };
        }
    }

    return best?.groupId ?? null;
}

function selectInitialTemplateForSemester(
    templates: TemplateInfo[],
    officer: InterviewOfficer,
    semester: number,
) {
    const { exact, generic } = splitTemplatesForSemester(templates, semester);

    const exactByText = selectBestTemplateByScore(exact, (template) => scoreInitialTemplate(template, officer));
    if (exactByText) return exactByText;

    const genericByText = selectBestTemplateByScore(generic, (template) => scoreInitialTemplate(template, officer));
    if (genericByText) return genericByText;
    return null;
}

function selectTermTemplateForSemester(
    templates: TemplateInfo[],
    variant: Exclude<TermVariant, "special">,
    semester: number,
) {
    const { exact, generic } = splitTemplatesForSemester(templates, semester);

    const selectFrom = (pool: TemplateInfo[]) => {
        const candidates = pool.filter((template) => isTermTemplateCandidate(template, variant));
        if (!candidates.length) return null;

        return (
            selectBestTemplateByScore(candidates, (template) => scoreTermTemplate(template, variant)) ??
            selectBestTemplate(candidates, termKeyConfig[variant].keys, {
                prefersSemester: true,
                aliasMap: termKeyAliases,
            })
        );
    };

    return selectFrom(exact) ?? selectFrom(generic);
}

function selectSpecialTemplateForSemester(templates: TemplateInfo[], semester: number) {
    const { exact, generic } = splitTemplatesForSemester(templates, semester);

    const selectFrom = (pool: TemplateInfo[]) => {
        const specialByText = selectBestTemplateByScore(pool, (template) => scoreTermTemplate(template, "special"));
        if (specialByText) {
            const groupId = selectBestGroupInTemplate(specialByText.template, termKeyConfig.special.keys, {
                aliasMap: specialKeyAliases,
            });
            if (groupId) {
                return { ...specialByText, groupId };
            }
        }

        return selectBestGroupTemplate(pool, termKeyConfig.special.keys, {
            prefersSemester: true,
            aliasMap: specialKeyAliases,
        });
    };

    return selectFrom(exact) ?? selectFrom(generic);
}

function buildEmptySemesterMap(): SemesterTemplateMap {
    return { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
}

function addTemplateIdMapping(
    byTemplateId: Map<string, { kind: string; groupId?: string }>,
    kind: string,
    match: TemplateMatch | null,
) {
    if (!match) return;
    if (!byTemplateId.has(match.template.id)) {
        byTemplateId.set(match.template.id, { kind, groupId: match.groupId });
        return;
    }

    const existing = byTemplateId.get(match.template.id);
    if (existing?.kind !== kind) {
        console.warn(`Interview template ${match.template.code} matched multiple kinds; using first match.`);
    }
}

export function getTemplateMatchForSemester(
    mappings: TemplateMappings | null | undefined,
    kind: InterviewTemplateKind,
    semester?: number | null,
) {
    if (!mappings) return null;
    if (semester != null && semester >= 1 && semester <= 6) {
        const bySemester = mappings.byKindSemester[kind];
        const match = bySemester?.[semester];
        if (match) return match;
    }
    return mappings.byKind[kind] ?? null;
}

export function buildTemplateMappings(templates: TemplateInfo[]): TemplateMappings {
    const byKind: Record<string, TemplateMatch | null> = {
        plcdr: null,
        dscoord: null,
        dycdr: null,
        cdr: null,
        beginning: null,
        postmid: null,
        special: null,
    };
    const byKindSemester: Record<string, SemesterTemplateMap> = {
        plcdr: buildEmptySemesterMap(),
        dscoord: buildEmptySemesterMap(),
        dycdr: buildEmptySemesterMap(),
        cdr: buildEmptySemesterMap(),
        beginning: buildEmptySemesterMap(),
        postmid: buildEmptySemesterMap(),
        special: buildEmptySemesterMap(),
    };

    byKind.plcdr = selectBestTemplateByScore(templates, (template) => scoreInitialTemplate(template, "plcdr"));
    byKind.dscoord = selectBestTemplateByScore(templates, (template) => scoreInitialTemplate(template, "dscoord"));
    byKind.dycdr = selectBestTemplateByScore(templates, (template) => scoreInitialTemplate(template, "dycdr"));
    byKind.cdr = selectBestTemplateByScore(templates, (template) => scoreInitialTemplate(template, "cdr"));

    const beginningCandidates = templates.filter((template) => isTermTemplateCandidate(template, "beginning"));
    const postmidCandidates = templates.filter((template) => isTermTemplateCandidate(template, "postmid"));

    byKind.beginning =
        selectBestTemplateByScore(beginningCandidates, (template) => scoreTermTemplate(template, "beginning")) ??
        selectBestTemplate(beginningCandidates, termKeyConfig.beginning.keys, {
            prefersSemester: termKeyConfig.beginning.prefersSemester,
            aliasMap: termKeyAliases,
        });

    byKind.postmid =
        selectBestTemplateByScore(postmidCandidates, (template) => scoreTermTemplate(template, "postmid")) ??
        selectBestTemplate(postmidCandidates, termKeyConfig.postmid.keys, {
            prefersSemester: termKeyConfig.postmid.prefersSemester,
            aliasMap: termKeyAliases,
        });

    const specialByText = selectBestTemplateByScore(templates, (template) => scoreTermTemplate(template, "special"));
    if (specialByText) {
        const groupId = selectBestGroupInTemplate(specialByText.template, termKeyConfig.special.keys, {
            aliasMap: specialKeyAliases,
        });
        if (groupId) {
            byKind.special = { ...specialByText, groupId };
        }
    }

    if (!byKind.special) {
        byKind.special = selectBestGroupTemplate(templates, termKeyConfig.special.keys, {
            prefersSemester: termKeyConfig.special.prefersSemester,
            aliasMap: specialKeyAliases,
        });
    }

    for (const semester of [1, 2, 3, 4, 5, 6] as const) {
        byKindSemester.plcdr[semester] = selectInitialTemplateForSemester(templates, "plcdr", semester) ?? byKind.plcdr;
        byKindSemester.dscoord[semester] = selectInitialTemplateForSemester(templates, "dscoord", semester) ?? byKind.dscoord;
        byKindSemester.dycdr[semester] = selectInitialTemplateForSemester(templates, "dycdr", semester) ?? byKind.dycdr;
        byKindSemester.cdr[semester] = selectInitialTemplateForSemester(templates, "cdr", semester) ?? byKind.cdr;

        byKindSemester.beginning[semester] =
            selectTermTemplateForSemester(templates, "beginning", semester) ?? byKind.beginning;
        byKindSemester.postmid[semester] =
            selectTermTemplateForSemester(templates, "postmid", semester) ?? byKind.postmid;
        byKindSemester.special[semester] = selectSpecialTemplateForSemester(templates, semester) ?? byKind.special;
    }

    const byTemplateId = new Map<string, { kind: string; groupId?: string }>();
    for (const [kind, match] of Object.entries(byKind)) {
        addTemplateIdMapping(byTemplateId, kind, match);
    }
    for (const [kind, semesterMap] of Object.entries(byKindSemester)) {
        for (const match of Object.values(semesterMap)) {
            addTemplateIdMapping(byTemplateId, kind, match);
        }
    }

    return { byKind, byKindSemester, byTemplateId };
}
