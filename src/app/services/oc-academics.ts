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
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';

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

function gradePointsFromMarks(marks: number) {
    const m = Math.max(0, Number(marks) || 0);
    if (m >= 80) return 9;
    if (m >= 70) return 8;
    if (m >= 60) return 7;
    if (m >= 55) return 6;
    if (m >= 50) return 5;
    if (m >= 45) return 4;
    if (m >= 41) return 3;
    if (m >= 38) return 2;
    if (m >= 35) return 1;
    return 0;
}

function computeSemesterGpa(view: AcademicSemesterView) {
    let totalCredits = 0;
    let totalWeighted = 0;

    for (const subject of view.subjects ?? []) {
        if (subject.includeTheory) {
            const credits = Number(subject.theoryCredits ?? subject.subject?.defaultTheoryCredits ?? 0);
            const points = gradePointsFromMarks(subject.theory?.totalMarks ?? 0);
            totalCredits += credits;
            totalWeighted += credits * points;
        }
        if (subject.includePractical) {
            const credits = Number(subject.practicalCredits ?? subject.subject?.defaultPracticalCredits ?? 0);
            const points = gradePointsFromMarks(subject.practical?.totalMarks ?? 0);
            totalCredits += credits;
            totalWeighted += credits * points;
        }
    }

    const sgpa = totalCredits > 0 ? totalWeighted / totalCredits : null;
    return { sgpa, totalCredits, totalWeighted };
}

async function recomputeAndPersistGpa(ocId: string) {
    const rows = await listSemesterMarksRows(ocId);
    if (!rows.length) return;
    const semestersWithRows = new Set(rows.map((r) => r.semester));
    const views = (await getOcAcademics(ocId)).filter((v) => semestersWithRows.has(v.semester));
    const ordered = [...views].sort((a, b) => a.semester - b.semester);

    let cumulativeCredits = 0;
    let cumulativeWeighted = 0;

    for (const view of ordered) {
        const { sgpa, totalCredits, totalWeighted } = computeSemesterGpa(view);
        cumulativeCredits += totalCredits;
        cumulativeWeighted += totalWeighted;
        const cgpa = cumulativeCredits > 0 ? cumulativeWeighted / cumulativeCredits : null;
        await upsertSemesterSummary(ocId, view.semester, {
            branchTag: view.branchTag,
            sgpa,
            cgpa,
        });
    }
}

export async function getOcAcademics(ocId: string, opts?: { semester?: number }): Promise<AcademicSemesterView[]> {
    const ocInfo = await getOcCourseInfo(ocId);
    if (!ocInfo) throw new ApiError(404, 'OC not found', 'not_found');

    const offerings = await listCourseOfferings(ocInfo.courseId, opts?.semester);
    let rows: SemesterMarksRow[] = [];
    if (opts?.semester) {
        const single = await getSemesterMarksRow(ocId, opts.semester);
        rows = single ? [single] : [];
    } else {
        rows = await listSemesterMarksRows(ocId);
    }

    const rowMap = new Map<number, Awaited<ReturnType<typeof getSemesterMarksRow>>>();
    for (const row of rows) {
        if (row) rowMap.set(row.semester, row);
    }

    const groupedOfferings = groupOfferingsBySemester(offerings);
    const semesterSet = new Set<number>();
    for (const key of groupedOfferings.keys()) semesterSet.add(key);
    for (const key of rowMap.keys()) semesterSet.add(key);

    if (opts?.semester && semesterSet.size === 0) {
        semesterSet.add(opts.semester);
    }

    const semesters = Array.from(semesterSet).sort((a, b) => a - b);

    return semesters.map((semester) => {
        const row = rowMap.get(semester) ?? null;
        const branchTag: BranchTag = row?.branchTag as BranchTag ?? determineBranchForSemester(semester, ocInfo.branch);
        return buildAcademicSemesterView({
            semester,
            branchTag,
            row: row ?? undefined,
            offerings: groupedOfferings.get(semester) ?? [],
        });
    });
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
