import { z } from 'zod';

export const IdSchema = z.object({ id: z.string().uuid() });
export const OcIdParam = z.object({ ocId: z.string().uuid() });
export const ReportIdParam = z.object({ reportId: z.string().uuid() });
export const Semester = z.coerce.number().int().min(1).max(6);

export const personalUpsertSchema = z.object({
    visibleIdentMarks: z.string().optional(),
    pi: z.string().optional(),
    dob: z.coerce.date().optional(),
    placeOfBirth: z.string().optional(),
    domicile: z.string().optional(),
    religion: z.string().optional(),
    nationality: z.string().optional(),
    bloodGroup: z.string().max(8).optional(),
    identMarks: z.string().optional(),
    mobileNo: z.string().optional(),
    email: z.string().email().optional(),
    passportNo: z.string().optional(),
    panNo: z.string().optional(),
    aadhaarNo: z.string().optional(),
    fatherName: z.string().optional(),
    fatherMobile: z.string().optional(),
    fatherAddrPerm: z.string().optional(),
    fatherAddrPresent: z.string().optional(),
    fatherProfession: z.string().optional(),
    guardianName: z.string().optional(),
    guardianAddress: z.string().optional(),
    monthlyIncome: z.coerce.number().int().optional(),
    nokDetails: z.string().optional(),
    nokAddrPerm: z.string().optional(),
    nokAddrPresent: z.string().optional(),
    nearestRailwayStation: z.string().optional(),
    familyInSecunderabad: z.string().optional(),
    relativeInArmedForces: z.string().optional(),
    govtFinancialAssistance: z.boolean().optional(),
    bankDetails: z.string().optional(),
    idenCardNo: z.string().optional(),
    upscRollNo: z.string().optional(),
    ssbCentre: z.string().optional(),
    games: z.string().optional(),
    hobbies: z.string().optional(),
    swimmer: z.boolean().optional(),
    languages: z.string().optional(),
    dsPiSsicNo: z.string().optional(),
    dsPiRank: z.string().optional(),
    dsPiName: z.string().optional(),
    dsPiUnitArm: z.string().optional(),
    dsPiMobile: z.string().optional(),
    dsDyIcNo: z.string().optional(),
    dsDyRank: z.string().optional(),
    dsDyName: z.string().optional(),
    dsDyUnitArm: z.string().optional(),
    dsDyMobile: z.string().optional(),
    dsCdrIcNo: z.string().optional(),
    dsCdrRank: z.string().optional(),
    dsCdrName: z.string().optional(),
    dsCdrUnitArm: z.string().optional(),
    dsCdrMobile: z.string().optional(),
});

export const familyCreateSchema = z.object({
    name: z.string().min(1),
    relation: z.string().min(1),
    age: z.coerce.number().int().min(0).optional(),
    occupation: z.string().optional(),
    education: z.string().optional(),
    mobileNo: z.string().optional(),
});
export const familyUpdateSchema = familyCreateSchema.partial();

export const eduCreateSchema = z.object({
    level: z.string().min(1),                     // X/XII/UG/PG/Other
    schoolOrCollege: z.string().min(1),
    boardOrUniv: z.string().optional(),
    subjects: z.string().optional(),
    totalPercent: z.coerce.number().int().min(0).max(100).optional(),
    perSubject: z.string().optional(),            // JSON string (optional)
});
export const eduUpdateSchema = eduCreateSchema.partial();

export const achieveCreateSchema = z.object({
    event: z.string().min(1),
    year: z.coerce.number().int().optional(),
    level: z.string().optional(),
    prize: z.string().optional(),
});
export const achieveUpdateSchema = achieveCreateSchema.partial();

export const autobiographyUpsertSchema = z.object({
    generalSelf: z.string().optional(),
    proficiencySports: z.string().optional(),
    achievementsNote: z.string().optional(),
    areasToWork: z.string().optional(),
    additionalInfo: z.string().optional(),
    filledOn: z.coerce.date().optional(),
    platoonCommanderName: z.string().optional(),
});

export const ssbReportUpsertSchema = z.object({
    overallPredictiveRating: z.coerce.number().int().min(0).max(10).nullable().optional(),
    scopeOfImprovement: z.string().nullable().optional(),
});

export const ssbPointCreateSchema = z.object({
    kind: z.enum(['POSITIVE', 'NEGATIVE']),
    remark: z.string().min(1),
    authorUserId: z.string().uuid().nullable().optional(),
    authorName: z.string().optional(),
});
export const ssbPointUpdateSchema = ssbPointCreateSchema.partial();

export const medicalCreateSchema = z.object({
    semester: Semester,
    date: z.coerce.date(),
    age: z.coerce.number().int().optional(),
    heightCm: z.coerce.number().int().optional(),
    ibwKg: z.coerce.number().int().optional(),
    abwKg: z.coerce.number().int().optional(),
    overwtPct: z.coerce.number().int().optional(),
    bmi: z.coerce.number().int().optional(),
    chestCm: z.coerce.number().int().optional(),
    medicalHistory: z.string().optional(),
    hereditaryIssues: z.string().optional(),
    allergies: z.string().optional(),
});
export const medicalUpdateSchema = medicalCreateSchema.partial();

export const medCatCreateSchema = z.object({
    semester: Semester,
    date: z.coerce.date(),
    mosAndDiagnostics: z.string().optional(),
    catFrom: z.coerce.date().nullable().optional(),
    catTo: z.coerce.date().nullable().optional(),
    mhFrom: z.coerce.date().nullable().optional(),
    mhTo: z.coerce.date().nullable().optional(),
    absence: z.string().optional(),
    platoonCommanderName: z.string().optional(),
});
export const medCatUpdateSchema = medCatCreateSchema.partial();

export const disciplineCreateSchema = z.object({
    semester: Semester,
    dateOfOffence: z.coerce.date(),
    offence: z.string().min(1),
    punishmentAwarded: z.string().optional(), // restrictions/ED/gating/…
    awardedOn: z.coerce.date().optional(),
    awardedBy: z.string().optional(),
    pointsDelta: z.coerce.number().int().optional(),             // e.g. -3, -1, 0
    pointsCumulative: z.coerce.number().int().optional(),
});
export const disciplineUpdateSchema = disciplineCreateSchema.partial();

export const commCreateSchema = z.object({
    semester: Semester,
    mode: z.enum(['LETTER', 'PHONE', 'EMAIL', 'IN_PERSON', 'OTHER']),
    letterNo: z.string().optional(),
    date: z.coerce.date(),
    brief: z.string().min(1),
    platoonCommanderName: z.string().optional(),
});
export const commUpdateSchema = commCreateSchema.partial();

// list query helpers
export const listQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).max(5000).optional(),
});
