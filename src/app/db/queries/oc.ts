import { db } from '@/app/db/client';
import { ApiError } from '@/app/lib/http';
import {
    ocPersonal, ocFamilyMembers, ocEducation, ocAchievements,
    ocAutobiography, ocSsbReports, ocSsbPoints,
    ocMedicals, ocMedicalCategory, ocDiscipline, ocParentComms,
    ocPreCommission,
    ocCommissioning,
    ocDelegations,
    ocCadets,
    ocMotivationAwards,
    ocSportsAndGames,
    ocWeaponTraining,
    ocSpecialAchievementInFiring,
    ocObstacleTraining,
    ocSpeedMarch,
    ocDrill,
    ocCounselling,
    ocClubs,
    ocRecordingLeaveHikeDetention,
    ocSpecialAchievementInClubs,
    ocCreditForExcellence,
    campSemesterKind,
    campReviewRoleKind,
    trainingCamps,
    ocCamps,
    trainingCampActivities,
    ocCampActivityScores,
    ocCampReviews,
    ocSemesterMarks,
    SemesterSubjectRecord,
    TheoryMarksRecord,
    PracticalMarksRecord,
} from '@/app/db/schema/training/oc';
import { courses } from '@/app/db/schema/training/courses';
import { platoons } from '@/app/db/schema/auth/platoons';
import { and, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';

type ListOpts = {
    q?: string;
    courseId?: string;
    active?: boolean;
    limit?: number;
    offset?: number;
};

// Escape % _ \ for ILIKE
function likeEscape(q: string) {
    return `%${q.replace(/[%_\\]/g, '\\$&')}%`;
}

type SemesterMarksRow = typeof ocSemesterMarks.$inferSelect;
type TheoryPatch = Partial<TheoryMarksRecord>;
type PracticalPatch = Partial<PracticalMarksRecord>;

function mergeTheory(target: TheoryMarksRecord | null | undefined, patch?: TheoryPatch) {
    if (!patch) return target ?? undefined;
    const next: TheoryMarksRecord = { ...(target ?? {}) };
    let changed = false;
    for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue;
        (next as any)[key] = value;
        changed = true;
    }
    return changed ? next : target;
}

function mergePractical(target: PracticalMarksRecord | null | undefined, patch?: PracticalPatch) {
    if (!patch) return target ?? undefined;
    const next: PracticalMarksRecord = { ...(target ?? {}) };
    let changed = false;
    for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue;
        (next as any)[key] = value;
        changed = true;
    }
    return changed ? next : target;
}

function cloneSubjects(existing?: SemesterMarksRow | null): SemesterSubjectRecord[] {
    if (!existing?.subjects) return [];
    return existing.subjects.map((subject) => ({
        ...subject,
        theory: subject.theory ? { ...subject.theory } : undefined,
        practical: subject.practical ? { ...subject.practical } : undefined,
        meta: subject.meta ? { ...subject.meta } : undefined,
    }));
}

export async function getOcCourseInfo(ocId: string) {
    const [row] = await db
        .select({ id: ocCadets.id, branch: ocCadets.branch, courseId: ocCadets.courseId })
        .from(ocCadets)
        .where(eq(ocCadets.id, ocId))
        .limit(1);
    return row ?? null;
}

export async function listSemesterMarksRows(ocId: string) {
    return db
        .select()
        .from(ocSemesterMarks)
        .where(and(eq(ocSemesterMarks.ocId, ocId), isNull(ocSemesterMarks.deletedAt)))
        .orderBy(ocSemesterMarks.semester);
}

export async function getSemesterMarksRow(ocId: string, semester: number) {
    const [row] = await db
        .select()
        .from(ocSemesterMarks)
        .where(and(eq(ocSemesterMarks.ocId, ocId), eq(ocSemesterMarks.semester, semester), isNull(ocSemesterMarks.deletedAt)))
        .limit(1);
    return row ?? null;
}

export type SemesterSubjectUpsertInput = {
    semesterBranchTag: 'C' | 'E' | 'M';
    subjectBranch: 'C' | 'E' | 'M';
    subjectCode: string;
    subjectName: string;
    theory?: TheoryPatch;
    practical?: PracticalPatch;
    meta?: SemesterSubjectRecord['meta'];
};

export type SemesterSummaryPatchInput = {
    branchTag: 'C' | 'E' | 'M';
    sgpa?: number | null;
    cgpa?: number | null;
    marksScored?: number | null;
};

export async function upsertSemesterSubjectMarks(ocId: string, semester: number, input: SemesterSubjectUpsertInput) {
    const now = new Date();
    return db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(ocSemesterMarks)
            .where(and(eq(ocSemesterMarks.ocId, ocId), eq(ocSemesterMarks.semester, semester)))
            .limit(1);

        const subjects = cloneSubjects(existing);
        const matchKey = input.meta?.subjectId ?? input.subjectCode;
        const idx = subjects.findIndex((subject) => {
            if (input.meta?.subjectId && subject.meta?.subjectId === input.meta.subjectId) return true;
            return subject.subjectCode === input.subjectCode;
        });

        const base: SemesterSubjectRecord = idx >= 0 ? { ...subjects[idx] } : {
            subjectCode: input.subjectCode,
            subjectName: input.subjectName,
            branch: input.subjectBranch,
        };

        base.subjectName = input.subjectName;
        base.branch = input.subjectBranch;
        base.meta = {
            ...(base.meta ?? {}),
            ...(input.meta ?? {}),
            deletedAt: null,
        };

        const nextTheory = mergeTheory(base.theory, input.theory);
        if (nextTheory) base.theory = nextTheory;
        const nextPractical = mergePractical(base.practical, input.practical);
        if (nextPractical) base.practical = nextPractical;

        if (idx >= 0) {
            subjects[idx] = base;
        } else {
            subjects.push(base);
        }

        if (existing) {
            const [updated] = await tx
                .update(ocSemesterMarks)
                .set({
                    branchTag: input.semesterBranchTag,
                    subjects,
                    deletedAt: null,
                    updatedAt: now,
                })
                .where(eq(ocSemesterMarks.id, existing.id))
                .returning();
            return updated;
        }

        const [created] = await tx
            .insert(ocSemesterMarks)
            .values({
                ocId,
                semester,
                branchTag: input.semesterBranchTag,
                subjects,
            })
            .returning();
        return created;
    });
}

export async function upsertSemesterSummary(ocId: string, semester: number, input: SemesterSummaryPatchInput) {
    const now = new Date();
    return db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(ocSemesterMarks)
            .where(and(eq(ocSemesterMarks.ocId, ocId), eq(ocSemesterMarks.semester, semester)))
            .limit(1);

        const patch: Partial<typeof ocSemesterMarks.$inferInsert> = {
            branchTag: input.branchTag,
            updatedAt: now,
        };

        if (input.sgpa !== undefined) patch.sgpa = input.sgpa;
        if (input.cgpa !== undefined) patch.cgpa = input.cgpa;
        if (input.marksScored !== undefined) patch.marksScored = input.marksScored;

        if (existing) {
            const [updated] = await tx
                .update(ocSemesterMarks)
                .set({ ...patch, deletedAt: null })
                .where(eq(ocSemesterMarks.id, existing.id))
                .returning();
            return updated;
        }

        const [created] = await tx
            .insert(ocSemesterMarks)
            .values({
                ocId,
                semester,
                branchTag: input.branchTag,
                deletedAt: null,
                subjects: [],
                sgpa: patch.sgpa,
                cgpa: patch.cgpa,
                marksScored: patch.marksScored,
            })
            .returning();
        return created;
    });
}

export async function deleteSemester(ocId: string, semester: number, opts: { hard?: boolean } = {}) {
    if (opts.hard) {
        const [row] = await db
            .delete(ocSemesterMarks)
            .where(and(eq(ocSemesterMarks.ocId, ocId), eq(ocSemesterMarks.semester, semester)))
            .returning();
        return row ?? null;
    }

    const [row] = await db
        .update(ocSemesterMarks)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(ocSemesterMarks.ocId, ocId), eq(ocSemesterMarks.semester, semester), isNull(ocSemesterMarks.deletedAt)))
        .returning();
    return row ?? null;
}

export async function deleteSemesterSubject(ocId: string, semester: number, subjectCode: string, opts: { hard?: boolean } = {}) {
    const now = new Date();
    return db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(ocSemesterMarks)
            .where(and(eq(ocSemesterMarks.ocId, ocId), eq(ocSemesterMarks.semester, semester), isNull(ocSemesterMarks.deletedAt)))
            .limit(1);
        if (!existing) return null;

        const subjects = cloneSubjects(existing);
        const idx = subjects.findIndex((subject) => {
            if (subject.meta?.subjectId && subject.meta.subjectId === subjectCode) return true;
            return subject.subjectCode === subjectCode;
        });
        if (idx === -1) return null;

        if (opts.hard) {
            subjects.splice(idx, 1);
        } else {
            subjects[idx] = {
                ...subjects[idx],
                meta: { ...(subjects[idx].meta ?? {}), deletedAt: now.toISOString() },
            };
        }

        const [updated] = await tx
            .update(ocSemesterMarks)
            .set({ subjects, updatedAt: now })
            .where(eq(ocSemesterMarks.id, existing.id))
            .returning();
        return updated;
    });
}
// ---- Personal ---------------------------------------------------------------
export async function getPersonal(ocId: string) {
    const [row] = await db.select().from(ocPersonal).where(eq(ocPersonal.ocId, ocId)).limit(1);
    return row ?? null;
}
export async function upsertPersonal(ocId: string, data: Partial<typeof ocPersonal.$inferInsert>) {
    const existing = await getPersonal(ocId);
    if (existing) {
        const [row] = await db.update(ocPersonal).set(data).where(eq(ocPersonal.ocId, ocId)).returning();
        return row;
    }
    const [row] = await db.insert(ocPersonal).values({ ocId, ...data }).returning();
    return row;
}
export async function deletePersonal(ocId: string) {
    const [row] = await db.delete(ocPersonal).where(eq(ocPersonal.ocId, ocId)).returning();
    return row ?? null;
}

// ---- Family members ---------------------------------------------------------
export async function listFamily(ocId: string, limit = 100, offset = 0) {
    return db.select().from(ocFamilyMembers).where(eq(ocFamilyMembers.ocId, ocId)).limit(limit).offset(offset);
}
export async function createFamily(ocId: string, data: Omit<typeof ocFamilyMembers.$inferInsert, 'ocId' | 'id'>) {
    const [row] = await db.insert(ocFamilyMembers).values({ ocId, ...data }).returning();
    return row;
}
export async function getFamily(ocId: string, id: string) {
    const [row] = await db.select().from(ocFamilyMembers).where(and(eq(ocFamilyMembers.id, id), eq(ocFamilyMembers.ocId, ocId))).limit(1);
    return row ?? null;
}
export async function updateFamily(ocId: string, id: string, data: Partial<typeof ocFamilyMembers.$inferInsert>) {
    const [row] = await db.update(ocFamilyMembers).set(data).where(and(eq(ocFamilyMembers.id, id), eq(ocFamilyMembers.ocId, ocId))).returning();
    return row ?? null;
}
export async function deleteFamily(ocId: string, id: string) {
    const [row] = await db.delete(ocFamilyMembers).where(and(eq(ocFamilyMembers.id, id), eq(ocFamilyMembers.ocId, ocId))).returning();
    return row ?? null;
}

// ---- Education --------------------------------------------------------------
export async function listEdu(ocId: string, limit = 100, offset = 0) {
    return db.select().from(ocEducation).where(eq(ocEducation.ocId, ocId)).limit(limit).offset(offset);
}
export async function createEdu(ocId: string, data: Omit<typeof ocEducation.$inferInsert, 'ocId' | 'id'>) {
    const [row] = await db.insert(ocEducation).values({ ocId, ...data }).returning();
    return row;
}
export async function getEdu(ocId: string, id: string) {
    const [row] = await db.select().from(ocEducation).where(and(eq(ocEducation.id, id), eq(ocEducation.ocId, ocId))).limit(1);
    return row ?? null;
}
export async function updateEdu(ocId: string, id: string, data: Partial<typeof ocEducation.$inferInsert>) {
    const [row] = await db.update(ocEducation).set(data).where(and(eq(ocEducation.id, id), eq(ocEducation.ocId, ocId))).returning();
    return row ?? null;
}
export async function deleteEdu(ocId: string, id: string) {
    const [row] = await db.delete(ocEducation).where(and(eq(ocEducation.id, id), eq(ocEducation.ocId, ocId))).returning();
    return row ?? null;
}

// ---- Achievements -----------------------------------------------------------
export async function listAchievements(ocId: string, limit = 100, offset = 0) {
    return db.select().from(ocAchievements).where(eq(ocAchievements.ocId, ocId)).limit(limit).offset(offset);
}
export async function createAchievement(ocId: string, data: Omit<typeof ocAchievements.$inferInsert, 'ocId' | 'id'>) {
    const [row] = await db.insert(ocAchievements).values({ ocId, ...data }).returning();
    return row;
}
export async function getAchievement(ocId: string, id: string) {
    const [row] = await db.select().from(ocAchievements).where(and(eq(ocAchievements.id, id), eq(ocAchievements.ocId, ocId))).limit(1);
    return row ?? null;
}
export async function updateAchievement(ocId: string, id: string, data: Partial<typeof ocAchievements.$inferInsert>) {
    const [row] = await db.update(ocAchievements).set(data).where(and(eq(ocAchievements.id, id), eq(ocAchievements.ocId, ocId))).returning();
    return row ?? null;
}
export async function deleteAchievement(ocId: string, id: string) {
    const [row] = await db.delete(ocAchievements).where(and(eq(ocAchievements.id, id), eq(ocAchievements.ocId, ocId))).returning();
    return row ?? null;
}

// ---- Autobiography (upsert single) -----------------------------------------
export async function getAutobio(ocId: string) {
    const [row] = await db.select().from(ocAutobiography).where(eq(ocAutobiography.ocId, ocId)).limit(1);
    return row ?? null;
}
export async function upsertAutobio(ocId: string, data: Partial<typeof ocAutobiography.$inferInsert>) {
    const existing = await getAutobio(ocId);
    if (existing) {
        const [row] = await db.update(ocAutobiography).set(data).where(eq(ocAutobiography.ocId, ocId)).returning();
        return row;
    }
    const [row] = await db.insert(ocAutobiography).values({ ocId, ...data }).returning();
    return row;
}
export async function deleteAutobio(ocId: string) {
    const [row] = await db.delete(ocAutobiography).where(eq(ocAutobiography.ocId, ocId)).returning();
    return row ?? null;
}

// ---- SSB report + points ----------------------------------------------------
export async function getSsbReport(ocId: string) {
    const [row] = await db.select().from(ocSsbReports).where(eq(ocSsbReports.ocId, ocId));
    return row ?? null;
}
export async function upsertSsbReport(ocId: string, data: Partial<typeof ocSsbReports.$inferInsert>) {
    const existing = await getSsbReport(ocId);
    if (existing) {
        const [row] = await db.update(ocSsbReports).set(data).where(eq(ocSsbReports.ocId, ocId)).returning();
        return row;
    }
    const [row] = await db.insert(ocSsbReports).values({ ocId, ...data }).returning();
    return row;
}

export type SsbNoteInput = {
    note: string;
    by: string;
};

export type SsbReportWithPointsInput = {
    positives: SsbNoteInput[];
    negatives: SsbNoteInput[];
    overallPredictiveRating: number | null;
    scopeOfImprovement: string | null;
};

export async function upsertSsbReportWithPoints(ocId: string, input: SsbReportWithPointsInput) {
    await db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(ocSsbReports)
            .where(eq(ocSsbReports.ocId, ocId))
            .limit(1);

        let report = existing;
        if (report) {
            const [updated] = await tx
                .update(ocSsbReports)
                .set({
                    overallPredictiveRating: input.overallPredictiveRating,
                    scopeOfImprovement: input.scopeOfImprovement,
                })
                .where(eq(ocSsbReports.ocId, ocId))
                .returning();
            report = updated;
        } else {
            const [created] = await tx
                .insert(ocSsbReports)
                .values({
                    ocId,
                    overallPredictiveRating: input.overallPredictiveRating,
                    scopeOfImprovement: input.scopeOfImprovement,
                })
                .returning();
            report = created;
        }

        if (!report) return;

        await tx.delete(ocSsbPoints).where(eq(ocSsbPoints.reportId, report.id));

        const pointRows = [
            ...input.positives.map((p) => ({
                reportId: report!.id,
                kind: 'POSITIVE' as const,
                remark: p.note,
                authorName: p.by,
                authorUserId: null,
            })),
            ...input.negatives.map((n) => ({
                reportId: report!.id,
                kind: 'NEGATIVE' as const,
                remark: n.note,
                authorName: n.by,
                authorUserId: null,
            })),
        ];

        if (pointRows.length) {
            await tx.insert(ocSsbPoints).values(pointRows);
        }
    });
}

export async function deleteSsbReport(ocId: string) {
    const [row] = await db.delete(ocSsbReports).where(eq(ocSsbReports.ocId, ocId)).returning();
    return row ?? null;
}

export async function listSsbPoints(reportId: string, limit = 100, offset = 0) {
    return db.select().from(ocSsbPoints).where(eq(ocSsbPoints.reportId, reportId)).offset(offset);
}
export async function createSsbPoint(reportId: string, data: Omit<typeof ocSsbPoints.$inferInsert, 'id' | 'reportId'>) {
    const [row] = await db.insert(ocSsbPoints).values({ reportId, ...data }).returning();
    return row;
}
export async function getSsbPoint(reportId: string, id: string) {
    const [row] = await db.select().from(ocSsbPoints).where(and(eq(ocSsbPoints.id, id), eq(ocSsbPoints.reportId, reportId))).limit(1);
    return row ?? null;
}
export async function updateSsbPoint(reportId: string, id: string, data: Partial<typeof ocSsbPoints.$inferInsert>) {
    const [row] = await db.update(ocSsbPoints).set(data).where(and(eq(ocSsbPoints.id, id), eq(ocSsbPoints.reportId, reportId))).returning();
    return row ?? null;
}
export async function deleteSsbPoint(reportId: string, id: string) {
    const [row] = await db.delete(ocSsbPoints).where(and(eq(ocSsbPoints.id, id), eq(ocSsbPoints.reportId, reportId))).returning();
    return row ?? null;
}

// ---- Medicals ---------------------------------------------------------------
export async function listMedicals(ocId: string, limit = 100, offset = 0) {
    return db.select().from(ocMedicals).where(eq(ocMedicals.ocId, ocId)).limit(limit).offset(offset);
}
export async function createMedical(ocId: string, data: Omit<typeof ocMedicals.$inferInsert, 'id' | 'ocId'>) {
    const [row] = await db.insert(ocMedicals).values({ ocId, ...data }).returning();
    return row;
}
export async function getMedical(ocId: string, id: string) {
    const [row] = await db.select().from(ocMedicals).where(and(eq(ocMedicals.id, id), eq(ocMedicals.ocId, ocId))).limit(1);
    return row ?? null;
}
export async function updateMedical(ocId: string, id: string, data: Partial<typeof ocMedicals.$inferInsert>) {
    const [row] = await db.update(ocMedicals).set(data).where(and(eq(ocMedicals.id, id), eq(ocMedicals.ocId, ocId))).returning();
    return row ?? null;
}
export async function deleteMedical(ocId: string, id: string) {
    const [row] = await db.delete(ocMedicals).where(and(eq(ocMedicals.id, id), eq(ocMedicals.ocId, ocId))).returning();
    return row ?? null;
}

// ---- Medical Category -------------------------------------------------------
export async function listMedCats(ocId: string, limit = 100, offset = 0) {
    return db.select().from(ocMedicalCategory).where(eq(ocMedicalCategory.ocId, ocId)).limit(limit).offset(offset);
}
export async function createMedCat(ocId: string, data: Omit<typeof ocMedicalCategory.$inferInsert, 'id' | 'ocId'>) {
    const [row] = await db.insert(ocMedicalCategory).values({ ocId, ...data }).returning();
    return row;
}
export async function getMedCat(ocId: string, id: string) {
    const [row] = await db.select().from(ocMedicalCategory).where(and(eq(ocMedicalCategory.id, id), eq(ocMedicalCategory.ocId, ocId))).limit(1);
    return row ?? null;
}
export async function updateMedCat(ocId: string, id: string, data: Partial<typeof ocMedicalCategory.$inferInsert>) {
    const [row] = await db.update(ocMedicalCategory).set(data).where(and(eq(ocMedicalCategory.id, id), eq(ocMedicalCategory.ocId, ocId))).returning();
    return row ?? null;
}
export async function deleteMedCat(ocId: string, id: string) {
    const [row] = await db.delete(ocMedicalCategory).where(and(eq(ocMedicalCategory.id, id), eq(ocMedicalCategory.ocId, ocId))).returning();
    return row ?? null;
}

// ---- Discipline -------------------------------------------------------------
export async function listDiscipline(ocId: string, limit = 100, offset = 0) {
    return db.select().from(ocDiscipline).where(eq(ocDiscipline.ocId, ocId)).limit(limit).offset(offset);
}
export async function createDiscipline(ocId: string, data: Omit<typeof ocDiscipline.$inferInsert, 'id' | 'ocId'>) {
    const [row] = await db.insert(ocDiscipline).values({ ocId, ...data }).returning();
    return row;
}
export async function getDiscipline(ocId: string, id: string) {
    const [row] = await db.select().from(ocDiscipline).where(and(eq(ocDiscipline.id, id), eq(ocDiscipline.ocId, ocId))).limit(1);
    return row ?? null;
}
export async function updateDiscipline(ocId: string, id: string, data: Partial<typeof ocDiscipline.$inferInsert>) {
    const [row] = await db.update(ocDiscipline).set(data).where(and(eq(ocDiscipline.id, id), eq(ocDiscipline.ocId, ocId))).returning();
    return row ?? null;
}
export async function deleteDiscipline(ocId: string, id: string) {
    const [row] = await db.delete(ocDiscipline).where(and(eq(ocDiscipline.id, id), eq(ocDiscipline.ocId, ocId))).returning();
    return row ?? null;
}

// ---- Parent communications --------------------------------------------------
export async function listComms(ocId: string, limit = 100, offset = 0) {
    return db.select().from(ocParentComms).where(eq(ocParentComms.ocId, ocId)).limit(limit).offset(offset);
}
export async function createComm(ocId: string, data: Omit<typeof ocParentComms.$inferInsert, 'id' | 'ocId'>) {
    const [row] = await db.insert(ocParentComms).values({ ocId, ...data }).returning();
    return row;
}
export async function getComm(ocId: string, id: string) {
    const [row] = await db.select().from(ocParentComms).where(and(eq(ocParentComms.id, id), eq(ocParentComms.ocId, ocId))).limit(1);
    return row ?? null;
}
export async function updateComm(ocId: string, id: string, data: Partial<typeof ocParentComms.$inferInsert>) {
    const [row] = await db.update(ocParentComms).set(data).where(and(eq(ocParentComms.id, id), eq(ocParentComms.ocId, ocId))).returning();
    return row ?? null;
}
export async function deleteComm(ocId: string, id: string) {
    const [row] = await db.delete(ocParentComms).where(and(eq(ocParentComms.id, id), eq(ocParentComms.ocId, ocId))).returning();
    return row ?? null;
}

// ---- Motivation awards ----------------------------------------------------
export async function listMotivationAwards(ocId: string, limit = 100, offset = 0) {
    return db
        .select()
        .from(ocMotivationAwards)
        .where(and(eq(ocMotivationAwards.ocId, ocId), isNull(ocMotivationAwards.deletedAt)))
        .limit(limit)
        .offset(offset);
}
export async function createMotivationAward(
    ocId: string,
    data: Omit<typeof ocMotivationAwards.$inferInsert, 'id' | 'ocId' | 'deletedAt'>,
) {
    const [row] = await db.insert(ocMotivationAwards).values({ ocId, ...data }).returning();
    return row;
}
export async function getMotivationAward(ocId: string, id: string) {
    const [row] = await db
        .select()
        .from(ocMotivationAwards)
        .where(and(eq(ocMotivationAwards.id, id), eq(ocMotivationAwards.ocId, ocId)))
        .limit(1);
    return row ?? null;
}
export async function updateMotivationAward(
    ocId: string,
    id: string,
    data: Partial<typeof ocMotivationAwards.$inferInsert>,
) {
    const [row] = await db
        .update(ocMotivationAwards)
        .set(data)
        .where(and(eq(ocMotivationAwards.id, id), eq(ocMotivationAwards.ocId, ocId)))
        .returning();
    return row ?? null;
}
export async function deleteMotivationAward(
    ocId: string,
    id: string,
    opts: { hard?: boolean } = {},
) {
    if (opts.hard) {
        const [row] = await db
            .delete(ocMotivationAwards)
            .where(and(eq(ocMotivationAwards.id, id), eq(ocMotivationAwards.ocId, ocId)))
            .returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ocMotivationAwards)
        .set({ deletedAt: new Date() })
        .where(and(eq(ocMotivationAwards.id, id), eq(ocMotivationAwards.ocId, ocId)))
        .returning();
    return row ?? null;
}

// ---- Sports & games --------------------------------------------------------
export async function listSportsAndGames(ocId: string, limit = 100, offset = 0) {
    return db
        .select()
        .from(ocSportsAndGames)
        .where(and(eq(ocSportsAndGames.ocId, ocId), isNull(ocSportsAndGames.deletedAt)))
        .limit(limit)
        .offset(offset);
}
export async function createSportsAndGames(
    ocId: string,
    data: Omit<typeof ocSportsAndGames.$inferInsert, 'id' | 'ocId' | 'deletedAt'>,
) {
    const [row] = await db.insert(ocSportsAndGames).values({ ocId, ...data }).returning();
    return row;
}
export async function getSportsAndGames(ocId: string, id: string) {
    const [row] = await db
        .select()
        .from(ocSportsAndGames)
        .where(and(eq(ocSportsAndGames.id, id), eq(ocSportsAndGames.ocId, ocId)))
        .limit(1);
    return row ?? null;
}
export async function updateSportsAndGames(
    ocId: string,
    id: string,
    data: Partial<typeof ocSportsAndGames.$inferInsert>,
) {
    const [row] = await db
        .update(ocSportsAndGames)
        .set(data)
        .where(and(eq(ocSportsAndGames.id, id), eq(ocSportsAndGames.ocId, ocId)))
        .returning();
    return row ?? null;
}
export async function deleteSportsAndGames(
    ocId: string,
    id: string,
    opts: { hard?: boolean } = {},
) {
    if (opts.hard) {
        const [row] = await db
            .delete(ocSportsAndGames)
            .where(and(eq(ocSportsAndGames.id, id), eq(ocSportsAndGames.ocId, ocId)))
            .returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ocSportsAndGames)
        .set({ deletedAt: new Date() })
        .where(and(eq(ocSportsAndGames.id, id), eq(ocSportsAndGames.ocId, ocId)))
        .returning();
    return row ?? null;
}

// ---- Weapon training -------------------------------------------------------
export async function listWeaponTraining(ocId: string, limit = 100, offset = 0) {
    return db
        .select()
        .from(ocWeaponTraining)
        .where(and(eq(ocWeaponTraining.ocId, ocId), isNull(ocWeaponTraining.deletedAt)))
        .limit(limit)
        .offset(offset);
}
export async function createWeaponTraining(
    ocId: string,
    data: Omit<typeof ocWeaponTraining.$inferInsert, 'id' | 'ocId' | 'deletedAt'>,
) {
    const [row] = await db.insert(ocWeaponTraining).values({ ocId, ...data }).returning();
    return row;
}
export async function getWeaponTraining(ocId: string, id: string) {
    const [row] = await db
        .select()
        .from(ocWeaponTraining)
        .where(and(eq(ocWeaponTraining.id, id), eq(ocWeaponTraining.ocId, ocId)))
        .limit(1);
    return row ?? null;
}
export async function updateWeaponTraining(
    ocId: string,
    id: string,
    data: Partial<typeof ocWeaponTraining.$inferInsert>,
) {
    const [row] = await db
        .update(ocWeaponTraining)
        .set(data)
        .where(and(eq(ocWeaponTraining.id, id), eq(ocWeaponTraining.ocId, ocId)))
        .returning();
    return row ?? null;
}
export async function deleteWeaponTraining(
    ocId: string,
    id: string,
    opts: { hard?: boolean } = {},
) {
    if (opts.hard) {
        const [row] = await db
            .delete(ocWeaponTraining)
            .where(and(eq(ocWeaponTraining.id, id), eq(ocWeaponTraining.ocId, ocId)))
            .returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ocWeaponTraining)
        .set({ deletedAt: new Date() })
        .where(and(eq(ocWeaponTraining.id, id), eq(ocWeaponTraining.ocId, ocId)))
        .returning();
    return row ?? null;
}

// ---- Special achievement in firing ----------------------------------------
export async function listSpecialAchievementInFiring(ocId: string, limit = 100, offset = 0) {
    return db
        .select()
        .from(ocSpecialAchievementInFiring)
        .where(and(eq(ocSpecialAchievementInFiring.ocId, ocId), isNull(ocSpecialAchievementInFiring.deletedAt)))
        .limit(limit)
        .offset(offset);
}
export async function createSpecialAchievementInFiring(
    ocId: string,
    data: Omit<typeof ocSpecialAchievementInFiring.$inferInsert, 'id' | 'ocId' | 'deletedAt'>,
) {
    const [row] = await db.insert(ocSpecialAchievementInFiring).values({ ocId, ...data }).returning();
    return row;
}
export async function getSpecialAchievementInFiring(ocId: string, id: string) {
    const [row] = await db
        .select()
        .from(ocSpecialAchievementInFiring)
        .where(and(eq(ocSpecialAchievementInFiring.id, id), eq(ocSpecialAchievementInFiring.ocId, ocId)))
        .limit(1);
    return row ?? null;
}
export async function updateSpecialAchievementInFiring(
    ocId: string,
    id: string,
    data: Partial<typeof ocSpecialAchievementInFiring.$inferInsert>,
) {
    const [row] = await db
        .update(ocSpecialAchievementInFiring)
        .set(data)
        .where(and(eq(ocSpecialAchievementInFiring.id, id), eq(ocSpecialAchievementInFiring.ocId, ocId)))
        .returning();
    return row ?? null;
}
export async function deleteSpecialAchievementInFiring(
    ocId: string,
    id: string,
    opts: { hard?: boolean } = {},
) {
    if (opts.hard) {
        const [row] = await db
            .delete(ocSpecialAchievementInFiring)
            .where(
                and(
                    eq(ocSpecialAchievementInFiring.id, id),
                    eq(ocSpecialAchievementInFiring.ocId, ocId),
                ),
            )
            .returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ocSpecialAchievementInFiring)
        .set({ deletedAt: new Date() })
        .where(
            and(
                eq(ocSpecialAchievementInFiring.id, id),
                eq(ocSpecialAchievementInFiring.ocId, ocId),
            ),
        )
        .returning();
    return row ?? null;
}

// ---- Obstacle training -----------------------------------------------------
export async function listObstacleTraining(ocId: string, limit = 100, offset = 0) {
    return db
        .select()
        .from(ocObstacleTraining)
        .where(and(eq(ocObstacleTraining.ocId, ocId), isNull(ocObstacleTraining.deletedAt)))
        .limit(limit)
        .offset(offset);
}
export async function createObstacleTraining(
    ocId: string,
    data: Omit<typeof ocObstacleTraining.$inferInsert, 'id' | 'ocId' | 'deletedAt'>,
) {
    const [row] = await db.insert(ocObstacleTraining).values({ ocId, ...data }).returning();
    return row;
}
export async function getObstacleTraining(ocId: string, id: string) {
    const [row] = await db
        .select()
        .from(ocObstacleTraining)
        .where(and(eq(ocObstacleTraining.id, id), eq(ocObstacleTraining.ocId, ocId)))
        .limit(1);
    return row ?? null;
}
export async function updateObstacleTraining(
    ocId: string,
    id: string,
    data: Partial<typeof ocObstacleTraining.$inferInsert>,
) {
    const [row] = await db
        .update(ocObstacleTraining)
        .set(data)
        .where(and(eq(ocObstacleTraining.id, id), eq(ocObstacleTraining.ocId, ocId)))
        .returning();
    return row ?? null;
}
export async function deleteObstacleTraining(
    ocId: string,
    id: string,
    opts: { hard?: boolean } = {},
) {
    if (opts.hard) {
        const [row] = await db
            .delete(ocObstacleTraining)
            .where(and(eq(ocObstacleTraining.id, id), eq(ocObstacleTraining.ocId, ocId)))
            .returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ocObstacleTraining)
        .set({ deletedAt: new Date() })
        .where(and(eq(ocObstacleTraining.id, id), eq(ocObstacleTraining.ocId, ocId)))
        .returning();
    return row ?? null;
}

// ---- Speed march -----------------------------------------------------------
export async function listSpeedMarch(ocId: string, limit = 100, offset = 0) {
    return db
        .select()
        .from(ocSpeedMarch)
        .where(and(eq(ocSpeedMarch.ocId, ocId), isNull(ocSpeedMarch.deletedAt)))
        .limit(limit)
        .offset(offset);
}
export async function createSpeedMarch(
    ocId: string,
    data: Omit<typeof ocSpeedMarch.$inferInsert, 'id' | 'ocId' | 'deletedAt'>,
) {
    const [row] = await db.insert(ocSpeedMarch).values({ ocId, ...data }).returning();
    return row;
}
export async function getSpeedMarch(ocId: string, id: string) {
    const [row] = await db
        .select()
        .from(ocSpeedMarch)
        .where(and(eq(ocSpeedMarch.id, id), eq(ocSpeedMarch.ocId, ocId)))
        .limit(1);
    return row ?? null;
}
export async function updateSpeedMarch(
    ocId: string,
    id: string,
    data: Partial<typeof ocSpeedMarch.$inferInsert>,
) {
    const [row] = await db
        .update(ocSpeedMarch)
        .set(data)
        .where(and(eq(ocSpeedMarch.id, id), eq(ocSpeedMarch.ocId, ocId)))
        .returning();
    return row ?? null;
}
export async function deleteSpeedMarch(
    ocId: string,
    id: string,
    opts: { hard?: boolean } = {},
) {
    if (opts.hard) {
        const [row] = await db
            .delete(ocSpeedMarch)
            .where(and(eq(ocSpeedMarch.id, id), eq(ocSpeedMarch.ocId, ocId)))
            .returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ocSpeedMarch)
        .set({ deletedAt: new Date() })
        .where(and(eq(ocSpeedMarch.id, id), eq(ocSpeedMarch.ocId, ocId)))
        .returning();
    return row ?? null;
}

// ---- Drill ------------------------------------------------------------------
export async function listDrill(ocId: string, limit = 100, offset = 0) {
    return db
        .select()
        .from(ocDrill)
        .where(and(eq(ocDrill.ocId, ocId), isNull(ocDrill.deletedAt)))
        .limit(limit)
        .offset(offset);
}
export async function createDrill(
    ocId: string,
    data: Omit<typeof ocDrill.$inferInsert, 'id' | 'ocId' | 'deletedAt'>,
) {
    const [row] = await db.insert(ocDrill).values({ ocId, ...data }).returning();
    return row;
}
export async function getDrill(ocId: string, id: string) {
    const [row] = await db
        .select()
        .from(ocDrill)
        .where(and(eq(ocDrill.id, id), eq(ocDrill.ocId, ocId), isNull(ocDrill.deletedAt)))
        .limit(1);
    return row ?? null;
}
export async function updateDrill(
    ocId: string,
    id: string,
    data: Partial<typeof ocDrill.$inferInsert>,
) {
    const [row] = await db
        .update(ocDrill)
        .set(data)
        .where(and(eq(ocDrill.id, id), eq(ocDrill.ocId, ocId)))
        .returning();
    return row ?? null;
}
export async function deleteDrill(
    ocId: string,
    id: string,
    opts: { hard?: boolean } = {},
) {
    if (opts.hard) {
        const [row] = await db
            .delete(ocDrill)
            .where(and(eq(ocDrill.id, id), eq(ocDrill.ocId, ocId)))
            .returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ocDrill)
        .set({ deletedAt: new Date() })
        .where(and(eq(ocDrill.id, id), eq(ocDrill.ocId, ocId)))
        .returning();
    return row ?? null;
}

// ---- Credit for excellence (CFE) -----------------------------------------
export async function listCreditForExcellence(ocId: string, limit = 100, offset = 0) {
    return db
        .select()
        .from(ocCreditForExcellence)
        .where(and(eq(ocCreditForExcellence.ocId, ocId), isNull(ocCreditForExcellence.deletedAt)))
        .limit(limit)
        .offset(offset);
}

export async function createCreditForExcellence(
    ocId: string,
    data: Omit<typeof ocCreditForExcellence.$inferInsert, 'id' | 'ocId' | 'deletedAt'>,
) {
    const [row] = await db
        .insert(ocCreditForExcellence)
        .values({ ocId, ...data })
        .onConflictDoUpdate({
            target: [ocCreditForExcellence.ocId, ocCreditForExcellence.semester],
            set: {
                data: data.data,
                remark: data.remark ?? null,
                deletedAt: null,
            },
        })
        .returning();
    return row;
}

export async function createManyCreditForExcellence(
    ocId: string,
    rows: Array<Omit<typeof ocCreditForExcellence.$inferInsert, 'id' | 'ocId' | 'deletedAt'>>,
) {
    if (!rows.length) return [];

    return db.transaction(async (tx) => {
        const created: Array<typeof ocCreditForExcellence.$inferSelect> = [];
        for (const item of rows) {
            const [row] = await tx
                .insert(ocCreditForExcellence)
                .values({ ocId, ...item })
                .onConflictDoUpdate({
                    target: [ocCreditForExcellence.ocId, ocCreditForExcellence.semester],
                    set: {
                        data: item.data,
                        remark: item.remark ?? null,
                        deletedAt: null,
                    },
                })
                .returning();
            if (row) created.push(row);
        }
        return created;
    });
}

export async function getCreditForExcellence(ocId: string, id: string) {
    const [row] = await db
        .select()
        .from(ocCreditForExcellence)
        .where(
            and(
                eq(ocCreditForExcellence.id, id),
                eq(ocCreditForExcellence.ocId, ocId),
                isNull(ocCreditForExcellence.deletedAt),
            ),
        )
        .limit(1);
    return row ?? null;
}

export async function updateCreditForExcellence(
    ocId: string,
    id: string,
    data: Partial<typeof ocCreditForExcellence.$inferInsert>,
) {
    const [row] = await db
        .update(ocCreditForExcellence)
        .set(data)
        .where(and(eq(ocCreditForExcellence.id, id), eq(ocCreditForExcellence.ocId, ocId)))
        .returning();
    return row ?? null;
}

export async function deleteCreditForExcellence(
    ocId: string,
    id: string,
    opts: { hard?: boolean } = {},
) {
    if (opts.hard) {
        const [row] = await db
            .delete(ocCreditForExcellence)
            .where(and(eq(ocCreditForExcellence.id, id), eq(ocCreditForExcellence.ocId, ocId)))
            .returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ocCreditForExcellence)
        .set({ deletedAt: new Date() })
        .where(and(eq(ocCreditForExcellence.id, id), eq(ocCreditForExcellence.ocId, ocId)))
        .returning();
    return row ?? null;
}

export async function listOCsBasic(opts: ListOpts = {}) {
    const { q, courseId, active, limit = 200, offset = 0 } = opts;

    const wh: any[] = [];
    if (q && q.trim()) {
        const pattern = likeEscape(q.trim());
        wh.push(or(ilike(ocCadets.name, pattern), ilike(ocCadets.ocNo, pattern)));
    }
    if (courseId && courseId.trim()) wh.push(eq(ocCadets.courseId, courseId.trim()));
    if (active) wh.push(isNull(ocCadets.withdrawnOn));

    const rows = await db
        .select({
            id: ocCadets.id,
            name: ocCadets.name,
            ocNo: ocCadets.ocNo,
            uid: ocCadets.uid,
            courseId: ocCadets.courseId,
            courseCode: courses.code,
            courseTitle: courses.title,
            branch: ocCadets.branch,
            platoonId: ocCadets.platoonId,
            platoonKey: platoons.key,
            platoonName: platoons.name,
            arrivalAtUniversity: ocCadets.arrivalAtUniversity,
            status: ocCadets.status,
            managerUserId: ocCadets.managerUserId,
            relegatedToCourseId: ocCadets.relegatedToCourseId,
            relegatedOn: ocCadets.relegatedOn,
            withdrawnOn: ocCadets.withdrawnOn,
            createdAt: ocCadets.createdAt,
            updatedAt: ocCadets.updatedAt,
        })
        .from(ocCadets)
        .leftJoin(courses, eq(courses.id, ocCadets.courseId))
        .leftJoin(platoons, eq(platoons.id, ocCadets.platoonId))
        .where(wh.length ? and(...wh) : undefined)
        .orderBy(ocCadets.createdAt)
        .limit(Math.min(limit, 1000))
        .offset(offset);

    return rows;
}

export async function listOCsFull(opts: ListOpts = {}) {
    const base = await listOCsBasic(opts);
    if (base.length === 0) return [];

    const ocIds = base.map((b) => b.id);

    const [
        personalRows,
        preCommRows,
        commRows,
        autoRows,
        famRows,
        eduRows,
        achRows,
        ssbReportRows,
        medRows,
        medCatRows,
        discRows,
        commsRows,
        delegRows,
        motivationAwardRows,
        sportsAndGamesRows,
        weaponTrainingRows,
        specialFiringRows,
        obstacleTrainingRows,
        speedMarchRows,
        drillRows,
        creditForExcellenceRows,
    ] = await Promise.all([
        db.select().from(ocPersonal).where(inArray(ocPersonal.ocId, ocIds)),
        db.select().from(ocPreCommission).where(inArray(ocPreCommission.ocId, ocIds)),
        db.select().from(ocCommissioning).where(inArray(ocCommissioning.ocId, ocIds)),
        db.select().from(ocAutobiography).where(inArray(ocAutobiography.ocId, ocIds)),
        db.select().from(ocFamilyMembers).where(inArray(ocFamilyMembers.ocId, ocIds)),
        db.select().from(ocEducation).where(inArray(ocEducation.ocId, ocIds)),
        db.select().from(ocAchievements).where(inArray(ocAchievements.ocId, ocIds)),
        db.select().from(ocSsbReports).where(inArray(ocSsbReports.ocId, ocIds)),
        db.select().from(ocMedicals).where(inArray(ocMedicals.ocId, ocIds)),
        db.select().from(ocMedicalCategory).where(inArray(ocMedicalCategory.ocId, ocIds)),
        db.select().from(ocDiscipline).where(inArray(ocDiscipline.ocId, ocIds)),
        db.select().from(ocParentComms).where(inArray(ocParentComms.ocId, ocIds)),
        db.select().from(ocDelegations).where(inArray(ocDelegations.ocId, ocIds)),
        db.select().from(ocMotivationAwards).where(inArray(ocMotivationAwards.ocId, ocIds)),
        db.select().from(ocSportsAndGames).where(inArray(ocSportsAndGames.ocId, ocIds)),
        db.select().from(ocWeaponTraining).where(inArray(ocWeaponTraining.ocId, ocIds)),
        db.select().from(ocSpecialAchievementInFiring).where(inArray(ocSpecialAchievementInFiring.ocId, ocIds)),
        db.select().from(ocObstacleTraining).where(inArray(ocObstacleTraining.ocId, ocIds)),
        db.select().from(ocSpeedMarch).where(inArray(ocSpeedMarch.ocId, ocIds)),
        db.select().from(ocDrill).where(inArray(ocDrill.ocId, ocIds)),
        db.select().from(ocCreditForExcellence).where(inArray(ocCreditForExcellence.ocId, ocIds)),
    ]);

    const reportIds = ssbReportRows.map((r) => r.id);
    const ssbPointRows = reportIds.length
        ? await db.select().from(ocSsbPoints).where(inArray(ocSsbPoints.reportId, reportIds))
        : [];

    // Index helpers
    const byOc = <T extends { ocId: string }>(rows: T[]) =>
        rows.reduce<Record<string, T[]>>((acc, r) => {
            (acc[r.ocId] ||= []).push(r);
            return acc;
        }, {});

    const oneByOc = <T extends { ocId: string }>(rows: T[]) =>
        rows.reduce<Record<string, T>>((acc, r) => {
            if (!(r.ocId in acc)) acc[r.ocId] = r; // take first if multiple present
            return acc;
        }, {});

    const personalByOc = oneByOc(personalRows);
    const preCommByOc = oneByOc(preCommRows);
    const commByOc = oneByOc(commRows);
    const autoByOc = oneByOc(autoRows);

    const famByOc = byOc(famRows);
    const eduByOc = byOc(eduRows);
    const achByOc = byOc(achRows);
    const medByOc = byOc(medRows);
    const medCatByOc = byOc(medCatRows);
    const discByOc = byOc(discRows);
    const commsByOc = byOc(commsRows);
    const delegByOc = byOc(delegRows);
    const motivationAwardsByOc = byOc(motivationAwardRows);
    const sportsAndGamesByOc = byOc(sportsAndGamesRows);
    const weaponTrainingByOc = byOc(weaponTrainingRows);
    const specialFiringByOc = byOc(specialFiringRows);
    const obstacleTrainingByOc = byOc(obstacleTrainingRows);
    const speedMarchByOc = byOc(speedMarchRows);
    const drillByOc = byOc(drillRows);
    const creditForExcellenceByOc = byOc(creditForExcellenceRows);

    const pointsByReport = ssbPointRows.reduce<Record<string, typeof ssbPointRows>>((acc, p) => {
        (acc[p.reportId] ||= []).push(p);
        return acc;
    }, {});
    const reportsByOc = ssbReportRows.reduce<Record<string, Array<any>>>((acc, r) => {
        const withPoints = { ...r, points: pointsByReport[r.id] ?? [] };
        (acc[r.ocId] ||= []).push(withPoints);
        return acc;
    }, {});

    // Assemble
    const items = base.map((b) => ({
        ...b,
        personal: personalByOc[b.id] ?? null,
        preCommission: preCommByOc[b.id] ?? null,
        commissioning: commByOc[b.id] ?? null,
        autobiography: autoByOc[b.id] ?? null,

        familyMembers: famByOc[b.id] ?? [],
        education: eduByOc[b.id] ?? [],
        achievements: achByOc[b.id] ?? [],
        ssbReports: reportsByOc[b.id] ?? [],
        medicals: medByOc[b.id] ?? [],
        medicalCategory: medCatByOc[b.id] ?? [],
        discipline: discByOc[b.id] ?? [],
        parentComms: commsByOc[b.id] ?? [],
        delegations: delegByOc[b.id] ?? [],
        motivationAwards: motivationAwardsByOc[b.id] ?? [],
        sportsAndGames: sportsAndGamesByOc[b.id] ?? [],
        weaponTraining: weaponTrainingByOc[b.id] ?? [],
        specialAchievementInFiring: specialFiringByOc[b.id] ?? [],
        obstacleTraining: obstacleTrainingByOc[b.id] ?? [],
        speedMarch: speedMarchByOc[b.id] ?? [],
        drill: drillByOc[b.id] ?? [],
        creditForExcellence: creditForExcellenceByOc[b.id] ?? [],
    }));

    return items;
}
// ---- Clubs --------------------------------------------------------------------
export async function listClubs(ocId: string, limit = 100, offset = 0) {
    return db
        .select()
        .from(ocClubs)
        .where(and(eq(ocClubs.ocId, ocId), isNull(ocClubs.deletedAt)))
        .limit(limit)
        .offset(offset);
}

export async function createClub(
    ocId: string,
    data: Omit<typeof ocClubs.$inferInsert, 'id' | 'ocId' | 'deletedAt'>,
) {
    const [row] = await db.insert(ocClubs).values({ ocId, ...data }).returning();
    return row;
}

export async function getClub(ocId: string, id: string) {
    const [row] = await db
        .select()
        .from(ocClubs)
        .where(and(eq(ocClubs.id, id), eq(ocClubs.ocId, ocId)))
        .limit(1);
    return row ?? null;
}

export async function updateClub(
    ocId: string,
    id: string,
    data: Partial<typeof ocClubs.$inferInsert>,
) {
    const [row] = await db
        .update(ocClubs)
        .set(data)
        .where(and(eq(ocClubs.id, id), eq(ocClubs.ocId, ocId)))
        .returning();
    return row ?? null;
}

export async function deleteClub(
    ocId: string,
    id: string,
    opts: { hard?: boolean } = {},
) {
    if (opts.hard) {
        const [row] = await db
            .delete(ocClubs)
            .where(and(eq(ocClubs.id, id), eq(ocClubs.ocId, ocId)))
            .returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ocClubs)
        .set({ deletedAt: new Date() })
        .where(and(eq(ocClubs.id, id), eq(ocClubs.ocId, ocId)))
        .returning();
    return row ?? null;
}

// ---- Special achievements in clubs -------------------------------------------
export async function listClubAchievements(ocId: string, limit = 100, offset = 0) {
    return db
        .select()
        .from(ocSpecialAchievementInClubs)
        .where(and(eq(ocSpecialAchievementInClubs.ocId, ocId), isNull(ocSpecialAchievementInClubs.deletedAt)))
        .limit(limit)
        .offset(offset);
}

export async function createClubAchievement(
    ocId: string,
    data: Omit<typeof ocSpecialAchievementInClubs.$inferInsert, 'id' | 'ocId' | 'deletedAt'>,
) {
    const [row] = await db
        .insert(ocSpecialAchievementInClubs)
        .values({ ocId, ...data })
        .returning();
    return row;
}

export async function getClubAchievement(ocId: string, id: string) {
    const [row] = await db
        .select()
        .from(ocSpecialAchievementInClubs)
        .where(and(eq(ocSpecialAchievementInClubs.id, id), eq(ocSpecialAchievementInClubs.ocId, ocId)))
        .limit(1);
    return row ?? null;
}

export async function updateClubAchievement(
    ocId: string,
    id: string,
    data: Partial<typeof ocSpecialAchievementInClubs.$inferInsert>,
) {
    const [row] = await db
        .update(ocSpecialAchievementInClubs)
        .set(data)
        .where(and(eq(ocSpecialAchievementInClubs.id, id), eq(ocSpecialAchievementInClubs.ocId, ocId)))
        .returning();
    return row ?? null;
}

export async function deleteClubAchievement(
    ocId: string,
    id: string,
    opts: { hard?: boolean } = {},
) {
    if (opts.hard) {
        const [row] = await db
            .delete(ocSpecialAchievementInClubs)
            .where(and(eq(ocSpecialAchievementInClubs.id, id), eq(ocSpecialAchievementInClubs.ocId, ocId)))
            .returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ocSpecialAchievementInClubs)
        .set({ deletedAt: new Date() })
        .where(and(eq(ocSpecialAchievementInClubs.id, id), eq(ocSpecialAchievementInClubs.ocId, ocId)))
        .returning();
    return row ?? null;
}

// ---- Recording leave/hike/detention ------------------------------------------
export async function listRecordingLeaveHikeDetention(ocId: string, limit = 100, offset = 0) {
    return db
        .select()
        .from(ocRecordingLeaveHikeDetention)
        .where(and(eq(ocRecordingLeaveHikeDetention.ocId, ocId), isNull(ocRecordingLeaveHikeDetention.deletedAt)))
        .limit(limit)
        .offset(offset);
}

export async function createRecordingLeaveHikeDetention(
    ocId: string,
    data: Omit<typeof ocRecordingLeaveHikeDetention.$inferInsert, 'id' | 'ocId' | 'deletedAt'>,
) {
    const [row] = await db
        .insert(ocRecordingLeaveHikeDetention)
        .values({ ocId, ...data })
        .returning();
    return row;
}

export async function getRecordingLeaveHikeDetention(ocId: string, id: string) {
    const [row] = await db
        .select()
        .from(ocRecordingLeaveHikeDetention)
        .where(and(eq(ocRecordingLeaveHikeDetention.id, id), eq(ocRecordingLeaveHikeDetention.ocId, ocId)))
        .limit(1);
    return row ?? null;
}

export async function updateRecordingLeaveHikeDetention(
    ocId: string,
    id: string,
    data: Partial<typeof ocRecordingLeaveHikeDetention.$inferInsert>,
) {
    const [row] = await db
        .update(ocRecordingLeaveHikeDetention)
        .set(data)
        .where(and(eq(ocRecordingLeaveHikeDetention.id, id), eq(ocRecordingLeaveHikeDetention.ocId, ocId)))
        .returning();
    return row ?? null;
}

export async function deleteRecordingLeaveHikeDetention(
    ocId: string,
    id: string,
    opts: { hard?: boolean } = {},
) {
    if (opts.hard) {
        const [row] = await db
            .delete(ocRecordingLeaveHikeDetention)
            .where(and(eq(ocRecordingLeaveHikeDetention.id, id), eq(ocRecordingLeaveHikeDetention.ocId, ocId)))
            .returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ocRecordingLeaveHikeDetention)
        .set({ deletedAt: new Date() })
        .where(and(eq(ocRecordingLeaveHikeDetention.id, id), eq(ocRecordingLeaveHikeDetention.ocId, ocId)))
        .returning();
    return row ?? null;
}

// ---- Counselling -------------------------------------------------------------
export async function listCounselling(ocId: string, limit = 100, offset = 0) {
    return db
        .select()
        .from(ocCounselling)
        .where(and(eq(ocCounselling.ocId, ocId), isNull(ocCounselling.deletedAt)))
        .limit(limit)
        .offset(offset);
}

export async function createCounselling(
    ocId: string,
    data: Omit<typeof ocCounselling.$inferInsert, 'id' | 'ocId' | 'deletedAt'>,
) {
    const [row] = await db.insert(ocCounselling).values({ ocId, ...data }).returning();
    return row;
}

export async function getCounselling(ocId: string, id: string) {
    const [row] = await db
        .select()
        .from(ocCounselling)
        .where(and(eq(ocCounselling.id, id), eq(ocCounselling.ocId, ocId)))
        .limit(1);
    return row ?? null;
}

export async function updateCounselling(
    ocId: string,
    id: string,
    data: Partial<typeof ocCounselling.$inferInsert>,
) {
    const [row] = await db
        .update(ocCounselling)
        .set(data)
        .where(and(eq(ocCounselling.id, id), eq(ocCounselling.ocId, ocId)))
        .returning();
    return row ?? null;
}

export async function deleteCounselling(
    ocId: string,
    id: string,
    opts: { hard?: boolean } = {},
) {
    if (opts.hard) {
        const [row] = await db
            .delete(ocCounselling)
            .where(and(eq(ocCounselling.id, id), eq(ocCounselling.ocId, ocId)))
            .returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ocCounselling)
        .set({ deletedAt: new Date() })
        .where(and(eq(ocCounselling.id, id), eq(ocCounselling.ocId, ocId)))
        .returning();
    return row ?? null;
}

// ---- Camps ------------------------------------------------------------------
type CampSemester = (typeof campSemesterKind.enumValues)[number];
type CampReviewRole = (typeof campReviewRoleKind.enumValues)[number];

export type OcCampWithDetails = {
    ocCampId: string;
    trainingCampId: string;
    campName: string;
    semester: CampSemester;
    maxTotalMarks: number;
    totalMarksScored: number | null;
    reviews?: Array<{
        id: string;
        role: CampReviewRole;
        sectionTitle: string;
        reviewText: string;
    }>;
    activities?: Array<{
        id: string;
        name: string;
        maxMarks: number;
        marksScored: number;
        remark: string | null;
    }>;
};

type GetOcCampsOptions = {
    ocId: string;
    ocCampId?: string;
    semester?: CampSemester;
    campName?: string;
    includeReviews?: boolean;
    includeActivities?: boolean;
    reviewRole?: CampReviewRole;
    activityName?: string;
};

type GetOcCampMarksOptions = {
    ocId: string;
    semester?: CampSemester;
    campName?: string;
    activityName?: string;
};

type GetOcCampTotalsOptions = {
    ocId: string;
    semester?: CampSemester;
};

const campActivityTotals = db
    .select({
        ocCampId: ocCampActivityScores.ocCampId,
        // Alias required so the raw SUM() column can be referenced from the subquery
        totalMarksScored: sql<number>`SUM(${ocCampActivityScores.marksScored})`.as('totalMarksScored'),
    })
    .from(ocCampActivityScores)
    .groupBy(ocCampActivityScores.ocCampId)
    .as('camp_activity_totals');

export async function getOcCamps(options: GetOcCampsOptions) {
    const { ocId, ocCampId, semester, campName, includeReviews, includeActivities, reviewRole, activityName } = options;
    const wh: any[] = [eq(ocCamps.ocId, ocId)];
    if (ocCampId) wh.push(eq(ocCamps.id, ocCampId));
    if (semester) wh.push(eq(trainingCamps.semester, semester));
    if (campName) wh.push(eq(trainingCamps.name, campName));

    const baseRows = await db
        .select({
            ocCampId: ocCamps.id,
            trainingCampId: trainingCamps.id,
            campName: trainingCamps.name,
            semester: trainingCamps.semester,
            maxTotalMarks: trainingCamps.maxTotalMarks,
            totalMarksScored: sql<number | null>`COALESCE(${campActivityTotals.totalMarksScored}, ${ocCamps.totalMarksScored})`,
        })
        .from(ocCamps)
        .innerJoin(trainingCamps, eq(trainingCamps.id, ocCamps.trainingCampId))
        .leftJoin(campActivityTotals, eq(campActivityTotals.ocCampId, ocCamps.id))
        .where(wh.length ? and(...wh) : undefined)
        .orderBy(trainingCamps.semester, trainingCamps.name);

    if (!baseRows.length) return { camps: [] as OcCampWithDetails[], grandTotalMarksScored: 0 };

    const ocCampIds = baseRows.map((r) => r.ocCampId);
    let reviewsByCamp: Record<string, NonNullable<OcCampWithDetails['reviews']>> = {};
    let activitiesByCamp: Record<string, NonNullable<OcCampWithDetails['activities']>> = {};

    if (includeReviews) {
        const reviewWh: any[] = [inArray(ocCampReviews.ocCampId, ocCampIds)];
        if (reviewRole) reviewWh.push(eq(ocCampReviews.role, reviewRole));
        const reviewRows = await db
            .select({
                id: ocCampReviews.id,
                ocCampId: ocCampReviews.ocCampId,
                role: ocCampReviews.role,
                sectionTitle: ocCampReviews.sectionTitle,
                reviewText: ocCampReviews.reviewText,
            })
            .from(ocCampReviews)
            .where(reviewWh.length ? and(...reviewWh) : undefined);
        reviewsByCamp = reviewRows.reduce<Record<string, typeof reviewRows>>((acc, row) => {
            (acc[row.ocCampId] ||= []).push(row);
            return acc;
        }, {});
    }

    if (includeActivities) {
        const actWh: any[] = [inArray(ocCampActivityScores.ocCampId, ocCampIds)];
        if (activityName) actWh.push(eq(trainingCampActivities.name, activityName));

        const activityRows = await db
            .select({
                id: ocCampActivityScores.id,
                ocCampId: ocCampActivityScores.ocCampId,
                name: trainingCampActivities.name,
                maxMarks: ocCampActivityScores.maxMarks,
                marksScored: ocCampActivityScores.marksScored,
                remark: ocCampActivityScores.remark,
            })
            .from(ocCampActivityScores)
            .innerJoin(trainingCampActivities, eq(trainingCampActivities.id, ocCampActivityScores.trainingCampActivityId))
            .where(actWh.length ? and(...actWh) : undefined)
            .orderBy(trainingCampActivities.sortOrder, trainingCampActivities.name);

        activitiesByCamp = activityRows.reduce<Record<string, typeof activityRows>>((acc, row) => {
            (acc[row.ocCampId] ||= []).push(row);
            return acc;
        }, {});
    }

    const camps: OcCampWithDetails[] = baseRows.map((row) => ({
        ...row,
        reviews: includeReviews ? reviewsByCamp[row.ocCampId] ?? [] : undefined,
        activities: includeActivities ? activitiesByCamp[row.ocCampId] ?? [] : undefined,
    }));

    const grandTotalMarksScored = camps.reduce((acc, c) => acc + (c.totalMarksScored ?? 0), 0);
    return { camps, grandTotalMarksScored };
}

export async function getOcCampMarks(options: GetOcCampMarksOptions) {
    const { ocId, semester, campName, activityName } = options;
    const wh: any[] = [eq(ocCamps.ocId, ocId)];
    if (semester) wh.push(eq(trainingCamps.semester, semester));
    if (campName) wh.push(eq(trainingCamps.name, campName));
    if (activityName) wh.push(eq(trainingCampActivities.name, activityName));

    const rows = await db
        .select({
            ocCampId: ocCamps.id,
            trainingCampId: trainingCamps.id,
            campName: trainingCamps.name,
            semester: trainingCamps.semester,
            activityName: trainingCampActivities.name,
            maxMarks: ocCampActivityScores.maxMarks,
            marksScored: ocCampActivityScores.marksScored,
            remark: ocCampActivityScores.remark,
            campTotalMarks: sql<number | null>`COALESCE(${campActivityTotals.totalMarksScored}, ${ocCamps.totalMarksScored})`,
        })
        .from(ocCampActivityScores)
        .innerJoin(ocCamps, eq(ocCamps.id, ocCampActivityScores.ocCampId))
        .innerJoin(trainingCamps, eq(trainingCamps.id, ocCamps.trainingCampId))
        .innerJoin(trainingCampActivities, eq(trainingCampActivities.id, ocCampActivityScores.trainingCampActivityId))
        .leftJoin(campActivityTotals, eq(campActivityTotals.ocCampId, ocCampActivityScores.ocCampId))
        .where(wh.length ? and(...wh) : undefined)
        .orderBy(trainingCamps.semester, trainingCamps.name, trainingCampActivities.sortOrder, trainingCampActivities.name);

    return rows;
}

export async function getOcCampTotals(options: GetOcCampTotalsOptions) {
    const { ocId, semester } = options;
    const wh: any[] = [eq(ocCamps.ocId, ocId)];
    if (semester) wh.push(eq(trainingCamps.semester, semester));

    const rows = await db
        .select({
            ocCampId: ocCamps.id,
            trainingCampId: trainingCamps.id,
            campName: trainingCamps.name,
            semester: trainingCamps.semester,
            maxTotalMarks: trainingCamps.maxTotalMarks,
            totalMarksScored: sql<number | null>`COALESCE(${campActivityTotals.totalMarksScored}, ${ocCamps.totalMarksScored})`,
        })
        .from(ocCamps)
        .innerJoin(trainingCamps, eq(trainingCamps.id, ocCamps.trainingCampId))
        .leftJoin(campActivityTotals, eq(campActivityTotals.ocCampId, ocCamps.id))
        .where(wh.length ? and(...wh) : undefined)
        .orderBy(trainingCamps.semester, trainingCamps.name);

    const grandTotalMarksScored = rows.reduce((acc, r) => acc + (r.totalMarksScored ?? 0), 0);
    return { items: rows, grandTotalMarksScored };
}

export async function upsertOcCamp(
    ocId: string,
    trainingCampId: string,
    data: Partial<typeof ocCamps.$inferInsert> = {},
) {
    const [campTemplate] = await db
        .select({ id: trainingCamps.id })
        .from(trainingCamps)
        .where(eq(trainingCamps.id, trainingCampId))
        .limit(1);
    if (!campTemplate) throw new ApiError(404, 'Training camp not found', 'not_found');

    const [existing] = await db
        .select()
        .from(ocCamps)
        .where(and(eq(ocCamps.ocId, ocId), eq(ocCamps.trainingCampId, trainingCampId)))
        .limit(1);

    if (existing) {
        const [row] = await db
            .update(ocCamps)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(ocCamps.id, existing.id))
            .returning();
        return row;
    }

    const [row] = await db.insert(ocCamps).values({ ocId, trainingCampId, ...data }).returning();
    return row;
}

export async function upsertOcCampReview(
    ocCampId: string,
    role: CampReviewRole,
    payload: Omit<typeof ocCampReviews.$inferInsert, 'id' | 'ocCampId' | 'role' | 'createdAt' | 'updatedAt'>,
) {
    const [existing] = await db
        .select()
        .from(ocCampReviews)
        .where(and(eq(ocCampReviews.ocCampId, ocCampId), eq(ocCampReviews.role, role)))
        .limit(1);

    if (existing) {
        const [row] = await db
            .update(ocCampReviews)
            .set({ ...payload, updatedAt: new Date() })
            .where(eq(ocCampReviews.id, existing.id))
            .returning();
        return row;
    }

    const [row] = await db
        .insert(ocCampReviews)
        .values({ ocCampId, role, ...payload })
        .returning();
    return row;
}

export async function upsertOcCampActivityScore(
    ocCampId: string,
    trainingCampActivityId: string,
    payload: { marksScored: number; remark?: string | null; maxMarks?: number },
) {
    const [activity] = await db
        .select({
            id: trainingCampActivities.id,
            trainingCampId: trainingCampActivities.trainingCampId,
            defaultMaxMarks: trainingCampActivities.defaultMaxMarks,
        })
        .from(trainingCampActivities)
        .where(eq(trainingCampActivities.id, trainingCampActivityId))
        .limit(1);
    if (!activity) throw new ApiError(404, 'Training camp activity not found', 'not_found');

    const [ocCamp] = await db
        .select({
            id: ocCamps.id,
            trainingCampId: ocCamps.trainingCampId,
        })
        .from(ocCamps)
        .where(eq(ocCamps.id, ocCampId))
        .limit(1);
    if (!ocCamp) throw new ApiError(404, 'OC camp not found', 'not_found');
    if (ocCamp.trainingCampId !== activity.trainingCampId) {
        throw new ApiError(400, 'Activity does not belong to this camp', 'bad_request');
    }

    const [existing] = await db
        .select()
        .from(ocCampActivityScores)
        .where(
            and(
                eq(ocCampActivityScores.ocCampId, ocCampId),
                eq(ocCampActivityScores.trainingCampActivityId, trainingCampActivityId),
            ),
        )
        .limit(1);

    const maxMarks = payload.maxMarks ?? existing?.maxMarks ?? activity.defaultMaxMarks;
    if (maxMarks === undefined || maxMarks === null) {
        throw new ApiError(400, 'maxMarks is required', 'bad_request');
    }
    if (payload.marksScored > maxMarks) {
        throw new ApiError(400, 'marksScored cannot exceed maxMarks', 'bad_request', {
            marksScored: payload.marksScored,
            maxMarks,
        });
    }
    if (payload.marksScored < 0) {
        throw new ApiError(400, 'marksScored cannot be negative', 'bad_request');
    }

    const payloadBase = {
        ocCampId,
        trainingCampActivityId,
        maxMarks,
        marksScored: payload.marksScored,
        remark: payload.remark !== undefined ? payload.remark : existing?.remark ?? null,
    };

    if (existing) {
        const [row] = await db
            .update(ocCampActivityScores)
            .set({ ...payloadBase, updatedAt: new Date() })
            .where(eq(ocCampActivityScores.id, existing.id))
            .returning();
        return row;
    }

    const [row] = await db.insert(ocCampActivityScores).values(payloadBase).returning();
    return row;
}

export async function deleteOcCamp(ocCampId: string) {
    const [row] = await db.delete(ocCamps).where(eq(ocCamps.id, ocCampId)).returning();
    return row ?? null;
}

export async function deleteOcCampReview(id: string) {
    const [row] = await db.delete(ocCampReviews).where(eq(ocCampReviews.id, id)).returning();
    return row ?? null;
}

export async function deleteOcCampActivityScore(id: string) {
    const [row] = await db.delete(ocCampActivityScores).where(eq(ocCampActivityScores.id, id)).returning();
    return row ?? null;
}

export async function recomputeOcCampTotal(ocCampId: string) {
    const [agg] = await db
        .select({
            total: sql<number | null>`SUM(${ocCampActivityScores.marksScored})`,
        })
        .from(ocCampActivityScores)
        .where(eq(ocCampActivityScores.ocCampId, ocCampId));

    const total = agg?.total ?? null;
    const [row] = await db
        .update(ocCamps)
        .set({ totalMarksScored: total, updatedAt: new Date() })
        .where(eq(ocCamps.id, ocCampId))
        .returning();
    return row;
}
