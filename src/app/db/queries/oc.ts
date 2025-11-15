import { db } from '@/app/db/client';
import {
    ocPersonal, ocFamilyMembers, ocEducation, ocAchievements,
    ocAutobiography, ocSsbReports, ocSsbPoints,
    ocMedicals, ocMedicalCategory, ocDiscipline, ocParentComms,
    ocPreCommission,
    ocCommissioning,
    ocDelegations,
    ocCadets,
} from '@/app/db/schema/training/oc';
import { courses } from '@/app/db/schema/training/courses';
import { platoons } from '@/app/db/schema/auth/platoons';
import { and, eq, ilike, inArray, isNull, or } from 'drizzle-orm';

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
    }));

    return items;
}
