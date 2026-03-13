import { ocSemesterMarks, SemesterSubjectRecord, TheoryMarksRecord, PracticalMarksRecord } from '@/app/db/schema/training/oc';
import type { CourseOfferingRow } from '@/app/db/queries/courses';

export type SemesterMarksRow = typeof ocSemesterMarks.$inferSelect;

export type TheoryMarksResponse = TheoryMarksRecord & {
    sessionalMarks: number;
    totalMarks: number;
};

export type PracticalMarksResponse = PracticalMarksRecord & {
    totalMarks: number;
};

export type AcademicSubjectView = {
    offeringId?: string | null;
    includeTheory: boolean;
    includePractical: boolean;
    theoryCredits?: number | null;
    practicalCredits?: number | null;
    subject: {
        id: string | null;
        code: string;
        name: string;
        branch: 'C' | 'E' | 'M';
        hasTheory: boolean;
        hasPractical: boolean;
        defaultTheoryCredits?: number | null;
        defaultPracticalCredits?: number | null;
        description?: string | null;
        createdAt?: string | null;
        updatedAt?: string | null;
        deletedAt?: string | null;
    };
    theory?: TheoryMarksResponse;
    practical?: PracticalMarksResponse;
};

export type AcademicSemesterView = {
    semester: number;
    branchTag: 'C' | 'E' | 'M';
    sgpa?: number | null;
    cgpa?: number | null;
    marksScored?: number | null;
    subjects: AcademicSubjectView[];
    createdAt: string;
    updatedAt: string;
};

function toIso(value?: Date | null) {
    return value ? value.toISOString() : null;
}

function toPositiveNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, parsed);
}

function computeTheory(theory?: TheoryMarksRecord | null): TheoryMarksResponse | undefined {
    if (!theory) return undefined;
    const tutorialRaw = typeof theory.tutorial === 'string' ? Number(theory.tutorial.replace(/[^\d.-]/g, '')) : Number(theory.tutorial ?? 0);
    const tutorialMarks = toPositiveNumber(tutorialRaw);
    // C# parity: each component contributes only when positive (Sign(x) == 1).
    const sessional =
        toPositiveNumber(theory.phaseTest1Marks) +
        toPositiveNumber(theory.phaseTest2Marks) +
        tutorialMarks;
    const total = sessional + toPositiveNumber(theory.finalMarks);
    return {
        ...theory,
        sessionalMarks: sessional,
        totalMarks: total,
    };
}

function computePractical(practical?: PracticalMarksRecord | null): PracticalMarksResponse | undefined {
    if (!practical) return undefined;
    return {
        ...practical,
        totalMarks: toPositiveNumber(practical.finalMarks),
    };
}

function subjectLookup(subjects?: SemesterSubjectRecord[]) {
    const map = new Map<string, SemesterSubjectRecord>();
    if (!subjects) return map;
    for (const subject of subjects) {
        if (subject.meta?.subjectId) {
            map.set(subject.meta.subjectId, subject);
        }
        map.set(subject.subjectCode, subject);
    }
    return map;
}

function baseSubjectInfo(fromOffering: CourseOfferingRow) {
    const subj = fromOffering.subject;
    return {
        id: subj.id,
        code: subj.code,
        name: subj.name,
        branch: (subj.branch ?? 'C') as 'C' | 'E' | 'M',
        hasTheory: !!subj.hasTheory,
        hasPractical: !!subj.hasPractical,
        defaultTheoryCredits: subj.defaultTheoryCredits ?? null,
        defaultPracticalCredits: subj.defaultPracticalCredits ?? null,
        description: subj.description ?? null,
        createdAt: toIso(subj.createdAt ?? null),
        updatedAt: toIso(subj.updatedAt ?? null),
        deletedAt: toIso(subj.deletedAt ?? null),
    };
}

function fallbackSubjectInfo(record: SemesterSubjectRecord) {
    return {
        id: record.meta?.subjectId ?? null,
        code: record.subjectCode,
        name: record.subjectName,
        branch: record.branch,
        hasTheory: Boolean(record.theory),
        hasPractical: Boolean(record.practical),
        defaultTheoryCredits: record.meta?.theoryCredits ?? null,
        defaultPracticalCredits: record.meta?.practicalCredits ?? null,
        description: null,
        createdAt: null,
        updatedAt: null,
        deletedAt: record.meta?.deletedAt ?? null,
    };
}

function entryFromOffering(
    offering: CourseOfferingRow,
    record?: SemesterSubjectRecord | null,
): AcademicSubjectView {
    const subjectInfo = baseSubjectInfo(offering);
    const theory = record?.theory ?? null;
    const practical = record?.practical ?? null;
    const theoryCredits =
        offering.theoryCredits ?? record?.meta?.theoryCredits ?? subjectInfo.defaultTheoryCredits ?? null;
    const practicalCredits =
        offering.practicalCredits ?? record?.meta?.practicalCredits ?? subjectInfo.defaultPracticalCredits ?? null;
    const theoryView = computeTheory(theory ?? undefined);
    const practicalView = computePractical(practical ?? undefined);

    if ((Number(theoryCredits ?? 0) <= 0) && theoryView) {
        theoryView.grade = undefined;
    }
    if ((Number(practicalCredits ?? 0) <= 0) && practicalView) {
        practicalView.grade = undefined;
    }

    return {
        offeringId: offering.id,
        includeTheory: offering.includeTheory,
        includePractical: offering.includePractical,
        theoryCredits,
        practicalCredits,
        subject: subjectInfo,
        theory: theoryView,
        practical: practicalView,
    };
}

function entryFromRecord(record: SemesterSubjectRecord): AcademicSubjectView {
    const theoryCredits = record.meta?.theoryCredits ?? null;
    const practicalCredits = record.meta?.practicalCredits ?? null;
    const theoryView = computeTheory(record.theory);
    const practicalView = computePractical(record.practical);

    if ((Number(theoryCredits ?? 0) <= 0) && theoryView) {
        theoryView.grade = undefined;
    }
    if ((Number(practicalCredits ?? 0) <= 0) && practicalView) {
        practicalView.grade = undefined;
    }

    return {
        offeringId: record.meta?.offeringId ?? null,
        includeTheory: Boolean(record.theory),
        includePractical: Boolean(record.practical),
        theoryCredits,
        practicalCredits,
        subject: fallbackSubjectInfo(record),
        theory: theoryView,
        practical: practicalView,
    };
}

export function buildAcademicSemesterView(opts: {
    semester: number;
    branchTag: 'C' | 'E' | 'M';
    row?: SemesterMarksRow | null;
    offerings: CourseOfferingRow[];
}): AcademicSemesterView {
    const { semester, branchTag, row, offerings } = opts;
    const lookup = subjectLookup(row?.subjects);
    const usedTargets = new Set<string>();

    const subjects: AcademicSubjectView[] = offerings.map((offering) => {
        const key = offering.subject.id ?? offering.subject.code;
        const record =
            (offering.subject.id ? lookup.get(offering.subject.id) : undefined) ??
            lookup.get(offering.subject.code);
        if (record?.meta?.subjectId) usedTargets.add(record.meta.subjectId);
        if (record) usedTargets.add(record.subjectCode);
        return entryFromOffering(offering, record);
    });

    const leftovers = (row?.subjects ?? []).filter((subject) => {
        const subjectKey = subject.meta?.subjectId ?? subject.subjectCode;
        return !usedTargets.has(subjectKey);
    });

    for (const record of leftovers) {
        if (record.meta?.deletedAt) continue;
        subjects.push(entryFromRecord(record));
    }

    const createdAt = toIso(row?.createdAt ?? null) ?? new Date().toISOString();
    const updatedAt = toIso(row?.updatedAt ?? null) ?? createdAt;

    return {
        semester,
        branchTag,
        sgpa: row?.sgpa ?? null,
        cgpa: row?.cgpa ?? null,
        marksScored: row?.marksScored ?? null,
        subjects,
        createdAt,
        updatedAt,
    };
}
