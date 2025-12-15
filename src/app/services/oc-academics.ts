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
    input: Omit<SemesterSummaryPatchInput, 'branchTag'>,
    auditContext?: AuditContext,
): Promise<AcademicSemesterView> {
    const ocInfo = await getOcCourseInfo(ocId);
    if (!ocInfo) throw new ApiError(404, 'OC not found', 'not_found');

    await upsertSemesterSummary(ocId, semester, {
        branchTag: determineBranchForSemester(semester, ocInfo.branch),
        ...input,
    });

    await logAcademicEvent(
        auditContext,
        AuditEventType.OC_ACADEMICS_SUMMARY_UPDATED,
        ocId,
        `Updated academic summary for semester ${semester}`,
        {
            semester,
            sgpa: input.sgpa ?? null,
            cgpa: input.cgpa ?? null,
            marksScored: input.marksScored ?? null,
        },
    );

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
        throw new ApiError(400, 'Subject is not valid for this course/semester.', 'bad_request');
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
        throw new ApiError(404, 'Subject not found for this semester.', 'not_found');
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

    return getOcAcademicSemester(ocId, semester);
}
