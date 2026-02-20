import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/app/db/client';
import {
    ocSprRecords,
    ocOlq,
    ocSportsAndGames,
    ocDrill,
    ocCreditForExcellence,
    ocCamps,
    trainingCamps,
} from '@/app/db/schema/training/oc';
import { ocPtTaskScores } from '@/app/db/schema/training/physicalTrainingOc';
import { getOcAcademicSemester } from '@/app/services/oc-academics';
import { getOrCreateActiveEnrollment } from '@/app/db/queries/oc-enrollments';

export type SemesterSourceScores = {
    academics: number;
    olq: number;
    ptSwimming: number;
    games: number;
    drill: number;
    camp: number;
    cfe: number;
};

export async function getSprRecord(ocId: string, semester: number) {
    const activeEnrollment = await getOrCreateActiveEnrollment(ocId);
    const [row] = await db
        .select()
        .from(ocSprRecords)
        .where(
            and(
                eq(ocSprRecords.ocId, ocId),
                eq(ocSprRecords.enrollmentId, activeEnrollment.id),
                eq(ocSprRecords.semester, semester),
            ),
        )
        .limit(1);
    return row ?? null;
}

export async function upsertSprRecord(
    ocId: string,
    semester: number,
    input: {
        cdrMarks?: number;
        subjectRemarks?: Record<string, string>;
        platoonCommanderRemarks?: string;
        deputyCommanderRemarks?: string;
        commanderRemarks?: string;
    },
) {
    const existing = await getSprRecord(ocId, semester);
    const activeEnrollment = await getOrCreateActiveEnrollment(ocId);
    const patch = {
        cdrMarks: input.cdrMarks ?? existing?.cdrMarks ?? 0,
        subjectRemarks: input.subjectRemarks ?? (existing?.subjectRemarks as Record<string, string> | undefined) ?? {},
        platoonCommanderRemarks: input.platoonCommanderRemarks ?? existing?.platoonCommanderRemarks ?? '',
        deputyCommanderRemarks: input.deputyCommanderRemarks ?? existing?.deputyCommanderRemarks ?? '',
        commanderRemarks: input.commanderRemarks ?? existing?.commanderRemarks ?? '',
        updatedAt: new Date(),
    };

    if (existing) {
        const [row] = await db.update(ocSprRecords).set(patch).where(eq(ocSprRecords.id, existing.id)).returning();
        return row;
    }

    const [created] = await db
        .insert(ocSprRecords)
        .values({ ocId, enrollmentId: activeEnrollment.id, semester, ...patch })
        .returning();
    return created;
}

export async function getSemesterSourceScores(ocId: string, semester: number): Promise<SemesterSourceScores> {
    const activeEnrollment = await getOrCreateActiveEnrollment(ocId);
    const academicSemester = await getOcAcademicSemester(ocId, semester);
    const academicSubjects = Array.isArray(academicSemester?.subjects) ? academicSemester.subjects : [];
    let academicScored = 0;
    let academicMax = 0;
    for (const subject of academicSubjects) {
        const includeTheory = Boolean(subject.includeTheory);
        const includePractical = Boolean(subject.includePractical);
        const theoryTotal = Number(subject.theory?.totalMarks ?? 0);
        const practicalTotal = Number(subject.practical?.totalMarks ?? 0);
        if (!includeTheory && !includePractical) continue;
        academicScored += (includeTheory ? theoryTotal : 0) + (includePractical ? practicalTotal : 0);
        academicMax += (includeTheory ? 100 : 0) + (includePractical ? 100 : 0);
    }
    const academicRatio = academicMax > 0 ? academicScored / academicMax : 0;
    const academicScaledRaw = Math.min(1350, Math.max(0, academicRatio * 1350));
    const academicScaled = Math.trunc((academicScaledRaw + Number.EPSILON) * 10) / 10;

    const [olq] = await db
        .select({ scored: ocOlq.totalMarks })
        .from(ocOlq)
        .where(and(eq(ocOlq.ocId, ocId), eq(ocOlq.enrollmentId, activeEnrollment.id), eq(ocOlq.semester, semester)))
        .limit(1);

    const [pt] = await db
        .select({ scored: sql<number>`COALESCE(SUM(${ocPtTaskScores.marksScored}), 0)` })
        .from(ocPtTaskScores)
        .where(
            and(
                eq(ocPtTaskScores.ocId, ocId),
                eq(ocPtTaskScores.enrollmentId, activeEnrollment.id),
                eq(ocPtTaskScores.semester, semester),
            ),
        );

    const [games] = await db
        .select({ scored: sql<number>`COALESCE(SUM(${ocSportsAndGames.marksObtained}), 0)` })
        .from(ocSportsAndGames)
        .where(
            and(
                eq(ocSportsAndGames.ocId, ocId),
                eq(ocSportsAndGames.enrollmentId, activeEnrollment.id),
                eq(ocSportsAndGames.semester, semester),
                isNull(ocSportsAndGames.deletedAt),
            ),
        );

    const drillRows = await db
        .select({
            m1: ocDrill.m1Marks,
            m2: ocDrill.m2Marks,
            a1c1: ocDrill.a1c1Marks,
            a2c2: ocDrill.a2c2Marks,
        })
        .from(ocDrill)
        .where(
            and(
                eq(ocDrill.ocId, ocId),
                eq(ocDrill.enrollmentId, activeEnrollment.id),
                eq(ocDrill.semester, semester),
                isNull(ocDrill.deletedAt),
            ),
        );
    const drill = drillRows.reduce(
        (acc, r) => acc + Number(r.m1 ?? 0) + Number(r.m2 ?? 0) + Number(r.a1c1 ?? 0) + Number(r.a2c2 ?? 0),
        0,
    );

    const cfeRows = await db
        .select({ data: ocCreditForExcellence.data })
        .from(ocCreditForExcellence)
        .where(
            and(
                eq(ocCreditForExcellence.ocId, ocId),
                eq(ocCreditForExcellence.enrollmentId, activeEnrollment.id),
                eq(ocCreditForExcellence.semester, semester),
                isNull(ocCreditForExcellence.deletedAt),
            ),
        );
    const cfe = cfeRows.reduce((acc, row) => {
        const items = Array.isArray(row.data) ? row.data : [];
        return acc + items.reduce((sum, item) => sum + Number((item as any)?.marks ?? 0), 0);
    }, 0);

    let camp = 0;
    if (semester === 5 || semester === 6) {
        const semKeys = semester === 5 ? ['SEM5'] : ['SEM6A', 'SEM6B'];
        const [campRow] = await db
            .select({ scored: sql<number>`COALESCE(SUM(${ocCamps.totalMarksScored}), 0)` })
            .from(ocCamps)
            .innerJoin(trainingCamps, eq(trainingCamps.id, ocCamps.trainingCampId))
            .where(
                and(
                    eq(ocCamps.ocId, ocId),
                    eq(ocCamps.enrollmentId, activeEnrollment.id),
                    inArray(trainingCamps.semester, semKeys as any),
                    isNull(ocCamps.deletedAt),
                    isNull(trainingCamps.deletedAt),
                ),
            );
        camp = Number(campRow?.scored ?? 0);
    }

    return {
        academics: Number(academicScaled ?? 0),
        olq: Number(olq?.scored ?? 0),
        ptSwimming: Number(pt?.scored ?? 0),
        games: Number(games?.scored ?? 0),
        drill,
        camp,
        cfe,
    };
}

export async function getAllSemesterSourceMarks(ocId: string) {
    const semesters = [1, 2, 3, 4, 5, 6];
    const results = await Promise.all(semesters.map((s) => getSemesterSourceScores(ocId, s)));
    return results.reduce((acc, row, idx) => {
        acc[semesters[idx]] = row;
        return acc;
    }, {} as Record<number, SemesterSourceScores>);
}
