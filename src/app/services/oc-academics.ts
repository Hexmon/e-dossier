import { ApiError } from '@/app/lib/http';
import { buildAcademicSemesterView, AcademicSemesterView, SemesterMarksRow } from '@/app/lib/semester-marks';
import { listCourseOfferings, getCourseOfferingForSubject, CourseOfferingRow } from '@/app/db/queries/courses';
import {
    getOcCourseInfo,
    listSemesterMarksRows,
    getSemesterMarksRow,
    upsertSemesterSummary,
    upsertSemesterSubjectMarks,
    deleteSemester,
    deleteSemesterSubject,
    SemesterSummaryPatchInput,
} from '@/app/db/queries/oc';
import { TheoryMarksRecord, PracticalMarksRecord } from '@/app/db/schema/training/oc';
import { getAcademicGradingPolicy } from '@/app/db/queries/academicGradingPolicy';
import { listSubjectsByIdsOrCodes } from '@/app/db/queries/subjects';
import { marksToGradePointsWithPolicy, roundPolicyValue, type AcademicGradingPolicy } from '@/app/lib/grading-policy';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { normalizePhaseTestCount } from '@/lib/academics-theory';

type BranchTag = 'C' | 'E' | 'M';

type AuditContext = {
    actorUserId?: string | null;
    actorRoles?: string[];
    request?: Request;
};

async function logAcademicEvent(
    ctx: AuditContext | undefined,
    eventType: string,
    ocId: string,
    description: string,
    metadata: Record<string, unknown>,
) {
    await createAuditLog({
        actorUserId: ctx?.actorUserId ?? null,
        eventType,
        resourceType: AuditResourceType.OC_ACADEMICS,
        resourceId: ocId,
        description,
        metadata: {
            ocId,
            ...metadata,
            actorRoles: ctx?.actorRoles ?? undefined,
        },
        request: ctx?.request,
    });
}

function groupOfferingsBySemester(rows: CourseOfferingRow[]) {
    const map = new Map<number, CourseOfferingRow[]>();
    for (const row of rows) {
        const list = map.get(row.semester) ?? [];
        list.push(row);
        map.set(row.semester, list);
    }
    return map;
}

function determineBranchForSemester(semester: number, branch?: string | null): BranchTag {
    if (semester <= 2) return 'C';
    if (branch === 'M') return 'M';
    if (branch === 'E') return 'E';
    return 'C';
}

function toIsoDate(value?: Date | null) {
    return value ? value.toISOString() : null;
}

function normalizeSubjectCode(value: string | null | undefined) {
    return (value ?? '').trim().toUpperCase();
}

export function hydrateAcademicViewsWithSubjectCatalog(
    views: AcademicSemesterView[],
    catalog: Array<Awaited<ReturnType<typeof listSubjectsByIdsOrCodes>>[number]>,
) {
    if (!catalog.length) return views;

    const byId = new Map(catalog.map((subject) => [subject.id, subject] as const));
    const byCode = new Map(catalog.map((subject) => [normalizeSubjectCode(subject.code), subject] as const));

    return views.map((view) => ({
        ...view,
        subjects: view.subjects.map((subject) => {
            const catalogSubject =
                (subject.subject.id ? byId.get(subject.subject.id) : undefined) ??
                byCode.get(normalizeSubjectCode(subject.subject.code));

            if (!catalogSubject) return subject;

            return {
                ...subject,
                theoryCredits:
                    subject.theoryCredits ??
                    catalogSubject.defaultTheoryCredits ??
                    subject.subject.defaultTheoryCredits ??
                    null,
                practicalCredits:
                    subject.practicalCredits ??
                    catalogSubject.defaultPracticalCredits ??
                    subject.subject.defaultPracticalCredits ??
                    null,
                subject: {
                    ...subject.subject,
                    id: subject.subject.id ?? catalogSubject.id,
                    name: subject.subject.name || catalogSubject.name,
                    branch: (subject.subject.branch || catalogSubject.branch) as BranchTag,
                    noOfPhaseTests: normalizePhaseTestCount(
                        subject.subject.noOfPhaseTests ?? catalogSubject.noOfPhaseTests,
                        subject.subject.hasTheory || catalogSubject.hasTheory,
                    ),
                    hasTheory: subject.subject.hasTheory || catalogSubject.hasTheory,
                    hasPractical: subject.subject.hasPractical || catalogSubject.hasPractical,
                    defaultTheoryCredits:
                        subject.subject.defaultTheoryCredits ?? catalogSubject.defaultTheoryCredits ?? null,
                    defaultPracticalCredits:
                        subject.subject.defaultPracticalCredits ?? catalogSubject.defaultPracticalCredits ?? null,
                    description: subject.subject.description ?? catalogSubject.description ?? null,
                    createdAt: subject.subject.createdAt ?? toIsoDate(catalogSubject.createdAt),
                    updatedAt: subject.subject.updatedAt ?? toIsoDate(catalogSubject.updatedAt),
                    deletedAt: subject.subject.deletedAt ?? toIsoDate(catalogSubject.deletedAt),
                },
            };
        }),
    }));
}

export function computeSemesterGpa(view: AcademicSemesterView, policy: AcademicGradingPolicy) {
    let totalCredits = 0;
    let totalWeighted = 0;
    let totalPoints = 0;
    let pointComponents = 0;

    for (const subject of view.subjects ?? []) {
        if (subject.includeTheory) {
            const credits = Number(subject.theoryCredits ?? subject.subject?.defaultTheoryCredits ?? 0);
            if (credits > 0) {
                const points = marksToGradePointsWithPolicy(subject.theory?.totalMarks ?? 0, policy);
                totalCredits += credits;
                totalWeighted += credits * points;
                totalPoints += points;
                pointComponents += 1;
            }
        }
        if (subject.includePractical) {
            const credits = Number(subject.practicalCredits ?? subject.subject?.defaultPracticalCredits ?? 0);
            if (credits > 0) {
                const points = marksToGradePointsWithPolicy(subject.practical?.totalMarks ?? 0, policy);
                totalCredits += credits;
                totalWeighted += credits * points;
                totalPoints += points;
                pointComponents += 1;
            }
        }
    }

    let sgpa: number | null = null;
    if (policy.sgpaFormulaTemplate === 'SEMESTER_AVG') {
        sgpa = pointComponents > 0 ? totalPoints / pointComponents : null;
    } else {
        sgpa = totalCredits > 0 ? totalWeighted / totalCredits : null;
    }

    return {
        sgpa: roundPolicyValue(sgpa, policy.roundingScale),
        totalCredits,
        totalWeighted,
    };
}

function computeDerivedGpaBySemester(
    views: AcademicSemesterView[],
    policy: AcademicGradingPolicy,
    semestersWithRows?: Set<number>
) {
    const ordered = [...views].sort((a, b) => a.semester - b.semester);
    const derived = new Map<number, { sgpa: number | null; cgpa: number | null }>();

    let cumulativeCredits = 0;
    let cumulativeWeighted = 0;
    let cumulativeSgpa = 0;
    let cumulativeSgpaCount = 0;

    for (const view of ordered) {
        if (semestersWithRows && !semestersWithRows.has(view.semester)) {
            continue;
        }

        const { sgpa, totalCredits, totalWeighted } = computeSemesterGpa(view, policy);
        cumulativeCredits += totalCredits;
        cumulativeWeighted += totalWeighted;
        if (sgpa !== null) {
            cumulativeSgpa += sgpa;
            cumulativeSgpaCount += 1;
        }

        let cgpa: number | null = null;
        if (policy.cgpaFormulaTemplate === 'SEMESTER_AVG') {
            cgpa = cumulativeSgpaCount > 0 ? cumulativeSgpa / cumulativeSgpaCount : null;
        } else {
            cgpa = cumulativeCredits > 0 ? cumulativeWeighted / cumulativeCredits : null;
        }

        derived.set(view.semester, {
            sgpa,
            cgpa: roundPolicyValue(cgpa, policy.roundingScale),
        });
    }

    return derived;
}

function applyComputedGpaToViews(
    views: AcademicSemesterView[],
    semestersWithRows: Set<number>,
    policy: AcademicGradingPolicy
) {
    if (!views.length || semestersWithRows.size === 0) return views;
    const derived = computeDerivedGpaBySemester(views, policy, semestersWithRows);

    return views.map((view) => {
        if (!semestersWithRows.has(view.semester)) return view;
        const next = derived.get(view.semester);
        if (!next) return view;
        return {
            ...view,
            sgpa: next.sgpa,
            cgpa: next.cgpa,
        };
    });
}

async function recomputeAndPersistGpa(ocId: string) {
    const rows = await listSemesterMarksRows(ocId);
    if (!rows.length) return;
    const policy = await getAcademicGradingPolicy();
    const semestersWithRows = new Set(rows.map((r) => r.semester));
    const views = (await getOcAcademics(ocId)).filter((v) => semestersWithRows.has(v.semester));
    const derived = computeDerivedGpaBySemester(views, policy, semestersWithRows);

    for (const view of [...views].sort((a, b) => a.semester - b.semester)) {
        const next = derived.get(view.semester) ?? { sgpa: null, cgpa: null };
        await upsertSemesterSummary(ocId, view.semester, {
            branchTag: view.branchTag,
            sgpa: next.sgpa,
            cgpa: next.cgpa,
        });
    }
}

export async function getOcAcademics(ocId: string, opts?: { semester?: number }): Promise<AcademicSemesterView[]> {
    const ocInfo = await getOcCourseInfo(ocId);
    if (!ocInfo) throw new ApiError(404, 'OC not found', 'not_found');
    const policy = await getAcademicGradingPolicy();

    // Always load all semester rows and offerings so CGPA is accurate even when fetching a single semester.
    const offerings = await listCourseOfferings(ocInfo.courseId);
    const rows = await listSemesterMarksRows(ocId);

    const rowMap = new Map<number, Awaited<ReturnType<typeof getSemesterMarksRow>>>();
    for (const row of rows) {
        if (row) rowMap.set(row.semester, row);
    }

    const legacySubjectIds = new Set<string>();
    const legacySubjectCodes = new Set<string>();
    for (const row of rows) {
        for (const subject of row.subjects ?? []) {
            if (subject.meta?.subjectId) legacySubjectIds.add(subject.meta.subjectId);
            if (subject.subjectCode) legacySubjectCodes.add(subject.subjectCode);
        }
    }

    const groupedOfferings = groupOfferingsBySemester(offerings);
    const semesterSet = new Set<number>();
    for (const key of groupedOfferings.keys()) semesterSet.add(key);
    for (const key of rowMap.keys()) semesterSet.add(key);

    if (opts?.semester && semesterSet.size === 0) {
        semesterSet.add(opts.semester);
    }

    const semesters = Array.from(semesterSet).sort((a, b) => a - b);

    const views = semesters.map((semester) => {
        const row = rowMap.get(semester) ?? null;
        const branchTag: BranchTag = row?.branchTag as BranchTag ?? determineBranchForSemester(semester, ocInfo.branch);
        return buildAcademicSemesterView({
            semester,
            branchTag,
            row: row ?? undefined,
            offerings: groupedOfferings.get(semester) ?? [],
        });
    });

    const subjectCatalog = await listSubjectsByIdsOrCodes({
        ids: Array.from(legacySubjectIds),
        codes: Array.from(legacySubjectCodes),
    });
    const hydratedViews = hydrateAcademicViewsWithSubjectCatalog(views, subjectCatalog);

    const semestersWithRows = new Set(rows.map((r) => r.semester));
    const computedViews = applyComputedGpaToViews(hydratedViews, semestersWithRows, policy);

    if (opts?.semester) {
        return computedViews.filter((view) => view.semester === opts.semester);
    }

    return computedViews;
}

export async function getOcAcademicSemester(ocId: string, semester: number): Promise<AcademicSemesterView> {
    const [entry] = await getOcAcademics(ocId, { semester });
    if (entry) {
        return entry;
    }
    const ocInfo = await getOcCourseInfo(ocId);
    if (!ocInfo) throw new ApiError(404, 'OC not found', 'not_found');
    const offerings = await listCourseOfferings(ocInfo.courseId, semester);
    return buildAcademicSemesterView({
        semester,
        branchTag: determineBranchForSemester(semester, ocInfo.branch),
        row: undefined,
        offerings,
    });
}

export async function updateOcAcademicSummary(
    ocId: string,
    semester: number,
    input: Omit<SemesterSummaryPatchInput, 'branchTag' | 'sgpa' | 'cgpa'>,
    auditContext?: AuditContext,
): Promise<AcademicSemesterView> {
    const ocInfo = await getOcCourseInfo(ocId);
    if (!ocInfo) throw new ApiError(404, 'OC not found', 'not_found');

    await upsertSemesterSummary(ocId, semester, {
        branchTag: determineBranchForSemester(semester, ocInfo.branch),
        marksScored: input.marksScored ?? undefined,
    });

    await logAcademicEvent(
        auditContext,
        AuditEventType.OC_ACADEMICS_SUMMARY_UPDATED,
        ocId,
        `Updated academic summary for semester ${semester}`,
        {
            semester,
            marksScored: input.marksScored ?? null,
        },
    );

    await recomputeAndPersistGpa(ocId);

    return getOcAcademicSemester(ocId, semester);
}

export async function updateOcAcademicSubject(
    ocId: string,
    semester: number,
    subjectId: string,
    data: { theory?: TheoryMarksRecord; practical?: PracticalMarksRecord },
    auditContext?: AuditContext,
) {
    const ocInfo = await getOcCourseInfo(ocId);
    if (!ocInfo) throw new ApiError(404, 'OC not found', 'not_found');

    const offering = await getCourseOfferingForSubject(ocInfo.courseId, semester, subjectId);
    if (!offering) {
        const validOfferings = await listCourseOfferings(ocInfo.courseId, semester);
        const validSubjects = validOfferings.map((row) => ({
            subjectId: row.subject.id,
            subjectCode: row.subject.code,
            subjectName: row.subject.name,
        }));
        throw new ApiError(400, 'Subject is not valid for this course/semester.', 'bad_request', {
            courseId: ocInfo.courseId,
            semester,
            validSubjects,
        });
    }

    await upsertSemesterSubjectMarks(ocId, semester, {
        semesterBranchTag: determineBranchForSemester(semester, ocInfo.branch),
        subjectBranch: (offering.subject.branch ?? 'C') as BranchTag,
        subjectCode: offering.subject.code,
            subjectName: offering.subject.name,
            theory: data.theory,
            practical: data.practical,
            meta: {
                subjectId: offering.subject.id,
                offeringId: offering.id,
                noOfPhaseTests: normalizePhaseTestCount(offering.subject.noOfPhaseTests, offering.includeTheory),
                theoryCredits: offering.theoryCredits ?? offering.subject.defaultTheoryCredits ?? null,
                practicalCredits: offering.practicalCredits ?? offering.subject.defaultPracticalCredits ?? null,
            },
        });

    await logAcademicEvent(
        auditContext,
        AuditEventType.OC_ACADEMICS_SUBJECT_UPDATED,
        ocId,
        `Updated academic subject ${offering.subject.code} for semester ${semester}`,
        {
            semester,
            subjectId: offering.subject.id,
            subjectCode: offering.subject.code,
            subjectName: offering.subject.name,
            theoryProvided: Boolean(data.theory),
            practicalProvided: Boolean(data.practical),
        },
    );

    await recomputeAndPersistGpa(ocId);

    return getOcAcademicSemester(ocId, semester);
}

export async function deleteOcAcademicSemester(
    ocId: string,
    semester: number,
    opts: { hard?: boolean } = {},
    auditContext?: AuditContext,
) {
    const row = await deleteSemester(ocId, semester, opts);
    if (!row) throw new ApiError(404, 'Academic semester not found', 'not_found');
    await logAcademicEvent(
        auditContext,
        AuditEventType.OC_ACADEMICS_SEMESTER_DELETED,
        ocId,
        `${opts.hard ? 'Hard' : 'Soft'} deleted academic semester ${semester}`,
        {
            semester,
            hardDeleted: Boolean(opts.hard),
        },
    );
    await recomputeAndPersistGpa(ocId);
    return { semester, hardDeleted: Boolean(opts.hard) };
}

export async function deleteOcAcademicSubject(
    ocId: string,
    semester: number,
    subjectId: string,
    opts: { hard?: boolean } = {},
    auditContext?: AuditContext,
) {
    const ocInfo = await getOcCourseInfo(ocId);
    if (!ocInfo) throw new ApiError(404, 'OC not found', 'not_found');
    const offering = await getCourseOfferingForSubject(ocInfo.courseId, semester, subjectId);
    if (!offering) {
        const validOfferings = await listCourseOfferings(ocInfo.courseId, semester);
        const validSubjects = validOfferings.map((row) => ({
            subjectId: row.subject.id,
            subjectCode: row.subject.code,
            subjectName: row.subject.name,
        }));
        throw new ApiError(404, 'Subject not found for this semester.', 'not_found', {
            courseId: ocInfo.courseId,
            semester,
            validSubjects,
        });
    }
    const result = await deleteSemesterSubject(ocId, semester, offering.subject.code, opts);
    if (!result) throw new ApiError(404, 'Subject record not found in academics', 'not_found');

    await logAcademicEvent(
        auditContext,
        AuditEventType.OC_ACADEMICS_SUBJECT_DELETED,
        ocId,
        `${opts.hard ? 'Hard' : 'Soft'} deleted academic subject ${offering.subject.code} for semester ${semester}`,
        {
            semester,
            subjectId: offering.subject.id,
            subjectCode: offering.subject.code,
            hardDeleted: Boolean(opts.hard),
        },
    );

    await recomputeAndPersistGpa(ocId);

    return getOcAcademicSemester(ocId, semester);
}
