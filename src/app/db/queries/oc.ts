import { db } from '@/app/db/client';
import {
    ocPersonal, ocFamilyMembers, ocEducation, ocAchievements,
    ocAutobiography, ocSsbReports, ocSsbPoints,
    ocMedicals, ocMedicalCategory, ocDiscipline, ocParentComms
} from '@/app/db/schema/training/oc';
import { eq, and } from 'drizzle-orm';

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
    const [row] = await db.select().from(ocSsbReports).where(eq(ocSsbReports.ocId, ocId)).limit(1);
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
export async function deleteSsbReport(ocId: string) {
    const [row] = await db.delete(ocSsbReports).where(eq(ocSsbReports.ocId, ocId)).returning();
    return row ?? null;
}

export async function listSsbPoints(reportId: string, limit = 100, offset = 0) {
    return db.select().from(ocSsbPoints).where(eq(ocSsbPoints.reportId, reportId)).limit(limit).offset(offset);
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
