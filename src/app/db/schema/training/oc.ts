import { pgTable, uuid, varchar, timestamp, text, integer, boolean, numeric, date, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { branchKind, ocStatusKind, commModeKind, ssbPointKind, delegationKind, termKind } from './enums';
import { courses } from './courses';
import { platoons } from '@/app/db/schema/auth/platoons';
import { users } from '@/app/db/schema/auth/users';
import { sql } from 'drizzle-orm';
import { pgEnum } from 'drizzle-orm/pg-core';

// NEW enums
export const leaveRecordKind = pgEnum('leave_record_kind', ['HIKE', 'LEAVE', 'DETENTION']);

export const counsellingWarningKind = pgEnum('counselling_warning_kind', [
    'RELEGATION',
    'WITHDRAWAL',
    'OTHER',
]);

export const campSemesterKind = pgEnum('camp_semester_kind', ['SEM5', 'SEM6A', 'SEM6B']);
export const campReviewRoleKind = pgEnum('camp_review_role_kind', ['OIC', 'PLATOON_COMMANDER', 'HOAT']);
export const ocImageKind = pgEnum('oc_image_kind', ['CIVIL_DRESS', 'UNIFORM']);
export const ocEnrollmentStatus = pgEnum('oc_enrollment_status', ['ACTIVE', 'ARCHIVED', 'VOIDED']);
export const ocEnrollmentOrigin = pgEnum('oc_enrollment_origin', ['PROMOTION', 'TRANSFER', 'MANUAL', 'BASELINE']);

export type CreditForExcellenceEntry = {
    cat: string;
    marks: number;
};

// === Core OC card ============================================================
export const ocCadets = pgTable('oc_cadets', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocNo: varchar('oc_no', { length: 32 }).notNull(),            // “No” on the form
    uid: varchar('uid', { length: 64 }).notNull(),               // internal unique id (roll/UID)
    name: varchar('name', { length: 160 }).notNull(),

    // current placement
    courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'restrict' }),
    branch: branchKind('branch').default('O'),                  // null=common (Sem 1–2)
    platoonId: uuid('platoon_id').references(() => platoons.id, { onDelete: 'set null' }),

    arrivalAtUniversity: timestamp('arrival_at_university', { withTimezone: true }).notNull(),

    // status/manager
    status: ocStatusKind('status').notNull().default('ACTIVE'),
    managerUserId: uuid('manager_user_id').references(() => users.id, { onDelete: 'set null' }),

    // lifecycle flags (quick pointers; detailed history lives elsewhere)
    relegatedToCourseId: uuid('relegated_to_course_id').references(() => courses.id, { onDelete: 'set null' }),
    relegatedOn: timestamp('relegated_on', { withTimezone: true }),
    withdrawnOn: timestamp('withdrawn_on', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// === OC images (2 per OC: civil dress, uniform) =============================
export const ocImages = pgTable('oc_images', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id')
        .notNull()
        .references(() => ocCadets.id, { onDelete: 'cascade' }),
    kind: ocImageKind('kind').notNull(),
    bucket: varchar('bucket', { length: 128 }).notNull(),
    objectKey: varchar('object_key', { length: 512 }).notNull(),
    contentType: varchar('content_type', { length: 128 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    etag: varchar('etag', { length: 128 }),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqOcImageKind: uniqueIndex('uq_oc_images_kind').on(t.ocId, t.kind),
}));

// === OC course enrollments (course-instance lifecycle) =======================
export const ocCourseEnrollments = pgTable('oc_course_enrollments', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id')
        .notNull()
        .references(() => ocCadets.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
        .notNull()
        .references(() => courses.id, { onDelete: 'restrict' }),
    status: ocEnrollmentStatus('status').notNull().default('ACTIVE'),
    origin: ocEnrollmentOrigin('origin').notNull().default('BASELINE'),
    startedOn: timestamp('started_on', { withTimezone: true }).notNull().defaultNow(),
    endedOn: timestamp('ended_on', { withTimezone: true }),
    reason: text('reason'),
    note: text('note'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    closedByUserId: uuid('closed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqOcActiveEnrollment: uniqueIndex('uq_oc_course_enrollment_active')
        .on(t.ocId)
        .where(sql`${t.status} = 'ACTIVE'`),
    idxOcStatusStarted: index('idx_oc_course_enrollment_oc_status_started').on(t.ocId, t.status, t.startedOn),
    idxCourseStatusStarted: index('idx_oc_course_enrollment_course_status_started').on(t.courseId, t.status, t.startedOn),
}));

export type TheoryMarksRecord = {
    phaseTest1Marks?: number | null;
    phaseTest2Marks?: number | null;
    tutorial?: string | null;
    finalMarks?: number | null;
    grade?: string | null;
};

export type PracticalMarksRecord = {
    finalMarks?: number | null;
    grade?: string | null;
    tutorial?: string | null;
};

export type SemesterSubjectRecord = {
    subjectCode: string;
    subjectName: string;
    branch: 'C' | 'E' | 'M';
    theory?: TheoryMarksRecord | null;
    practical?: PracticalMarksRecord | null;
    meta?: {
        subjectId?: string | null;
        offeringId?: string | null;
        theoryCredits?: number | null;
        practicalCredits?: number | null;
        deletedAt?: string | null;
    };
};

export const ocSemesterMarks = pgTable('oc_semester_marks', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id')
        .notNull()
        .references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    semester: integer('semester').notNull(),
    branchTag: varchar('branch_tag', { length: 1 }).notNull(),
    sgpa: numeric('sgpa', { mode: 'number' }),
    cgpa: numeric('cgpa', { mode: 'number' }),
    marksScored: numeric('marks_scored', { mode: 'number' }),
    subjects: jsonb('subjects')
        .$type<SemesterSubjectRecord[]>()
        .notNull()
        .default(sql`'[]'::jsonb`),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqOcSemester: uniqueIndex('uq_oc_semester_marks').on(t.enrollmentId, t.semester),
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
    idxOcSemesterByEnrollment: index('idx_oc_semester_marks_enrollment_sem').on(t.enrollmentId, t.semester),
}));

// === Pre-commission track (1 row per OC; current snapshot) ===================
export const ocPreCommission = pgTable('oc_pre_commission', {
    ocId: uuid('oc_id').primaryKey().references(() => ocCadets.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'restrict' }),
    branch: branchKind('branch').default('O'),
    platoonId: uuid('platoon_id').references(() => platoons.id, { onDelete: 'set null' }),

    relegatedToCourseId: uuid('relegated_to_course_id').references(() => courses.id, { onDelete: 'set null' }),
    relegatedOn: timestamp('relegated_on', { withTimezone: true }),
    withdrawnOn: timestamp('withdrawn_on', { withTimezone: true }),
});

// === Commissioning details (0/1 row) ========================================
export const ocCommissioning = pgTable('oc_commissioning', {
    ocId: uuid('oc_id').primaryKey().references(() => ocCadets.id, { onDelete: 'cascade' }),
    passOutDate: timestamp('pass_out_date', { withTimezone: true }),
    icNo: varchar('ic_no', { length: 48 }),
    orderOfMerit: integer('order_of_merit'),
    regimentOrArm: varchar('regiment_or_arm', { length: 128 }),
    postedUnit: text('posted_unit'),
});

// === Personal particulars (wide but practical) ==============================
export const ocPersonal = pgTable('oc_personal', {
    ocId: uuid('oc_id').primaryKey().references(() => ocCadets.id, { onDelete: 'cascade' }),
    visibleIdentMarks: text('visible_ident_marks'),
    pi: varchar('pi', { length: 64 }),
    dob: timestamp('dob', { withTimezone: true }),
    placeOfBirth: varchar('place_of_birth', { length: 128 }),
    domicile: varchar('domicile', { length: 128 }),
    religion: varchar('religion', { length: 64 }),
    nationality: varchar('nationality', { length: 64 }),
    bloodGroup: varchar('blood_group', { length: 8 }),
    identMarks: text('ident_marks'),

    // Contacts & IDs
    mobileNo: varchar('mobile_no', { length: 32 }),
    email: varchar('email', { length: 255 }),
    passportNo: varchar('passport_no', { length: 64 }),
    panNo: varchar('pan_no', { length: 20 }),
    aadhaarNo: varchar('aadhaar_no', { length: 16 }),

    // Family / NOK (store as free fields; detailed members table below)
    fatherName: varchar('father_name', { length: 160 }),
    fatherMobile: varchar('father_mobile', { length: 32 }),
    fatherAddrPerm: text('father_addr_permanent'),
    fatherAddrPresent: text('father_addr_present'),
    fatherProfession: varchar('father_profession', { length: 128 }),
    guardianName: varchar('guardian_name', { length: 160 }),
    guardianAddress: text('guardian_address'),
    monthlyIncome: integer('monthly_income'),
    nokDetails: text('nok_details'),
    nokAddrPerm: text('nok_addr_perm'),
    nokAddrPresent: text('nok_addr_present'),
    nearestRailwayStation: varchar('nearest_railway_station', { length: 128 }),
    familyInSecunderabad: text('family_in_secunderabad'),
    relativeInArmedForces: text('relative_in_armed_forces'),
    govtFinancialAssistance: boolean('govt_financial_assistance').default(false),

    // Bank & related
    bankDetails: text('bank_details'),
    idenCardNo: varchar('iden_card_no', { length: 64 }),
    upscRollNo: varchar('upsc_roll_no', { length: 32 }),
    ssbCentre: varchar('ssb_centre', { length: 64 }),

    // Other info
    games: text('games'),
    hobbies: text('hobbies'),
    swimmer: boolean('is_swimmer'),
    languages: text('languages'),

    // DS details (last term)
    dsPiSsicNo: varchar('ds_pi_ss_ic_no', { length: 64 }),
    dsPiRank: varchar('ds_pi_rank', { length: 64 }),
    dsPiName: varchar('ds_pi_name', { length: 160 }),
    dsPiUnitArm: varchar('ds_pi_unit_arm', { length: 160 }),
    dsPiMobile: varchar('ds_pi_mobile', { length: 32 }),

    dsDyIcNo: varchar('ds_dy_ic_no', { length: 64 }),
    dsDyRank: varchar('ds_dy_rank', { length: 64 }),
    dsDyName: varchar('ds_dy_name', { length: 160 }),
    dsDyUnitArm: varchar('ds_dy_unit_arm', { length: 160 }),
    dsDyMobile: varchar('ds_dy_mobile', { length: 32 }),

    dsCdrIcNo: varchar('ds_cdr_ic_no', { length: 64 }),
    dsCdrRank: varchar('ds_cdr_rank', { length: 64 }),
    dsCdrName: varchar('ds_cdr_name', { length: 160 }),
    dsCdrUnitArm: varchar('ds_cdr_unit_arm', { length: 160 }),
    dsCdrMobile: varchar('ds_cdr_mobile', { length: 32 }),
});

// === Family background members ==============================================
export const ocFamilyMembers = pgTable('oc_family_members', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    relation: varchar('relation', { length: 64 }).notNull(),     // Parent / Guardian / Sibling
    age: integer('age'),
    occupation: varchar('occupation', { length: 128 }),
    education: varchar('education', { length: 128 }),
    mobileNo: varchar('mobile_no', { length: 32 }),
});

// === Education qualifications ===============================================
export const ocEducation = pgTable('oc_education', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    level: varchar('level', { length: 64 }).notNull(),            // X / XII / UG / PG / Other
    schoolOrCollege: varchar('school_or_college', { length: 160 }).notNull(),
    boardOrUniv: varchar('board_or_univ', { length: 160 }),
    subjects: text('subjects'),                                   // comma list or JSON in future
    grade: varchar('grade', { length: 32 }),
    totalPercent: text('total_percent'),
    perSubject: text('per_subject'),                              // JSON string if needed
});

// === Achievements ============================================================
export const ocAchievements = pgTable('oc_achievements', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    event: varchar('event', { length: 160 }).notNull(),
    year: integer('year'),
    level: varchar('level', { length: 64 }),                       // school/state/national…
    prize: varchar('prize', { length: 128 }),
});

// === Autobiography ===========================================================
export const ocAutobiography = pgTable('oc_autobiography', {
    ocId: uuid('oc_id').primaryKey().references(() => ocCadets.id, { onDelete: 'cascade' }),
    generalSelf: text('general_self'),
    proficiencySports: text('proficiency_sports'),
    achievementsNote: text('achievements_note'),
    areasToWork: text('areas_to_work'),
    additionalInfo: text('additional_info'),
    filledOn: timestamp('filled_on', { withTimezone: true }),
    platoonCommanderName: varchar('platoon_commander_name', { length: 160 }),
});

// === Dossier Filling =========================================================
export const ocDossierFilling = pgTable('oc_dossier_filling', {
    ocId: uuid('oc_id').primaryKey().references(() => ocCadets.id, { onDelete: 'cascade' }),
    initiatedBy: varchar('initiated_by', { length: 160 }),
    openedOn: timestamp('opened_on', { withTimezone: true }),
    initialInterview: text('initial_interview'),
    closedBy: varchar('closed_by', { length: 160 }),
    closedOn: timestamp('closed_on', { withTimezone: true }),
    finalInterview: text('final_interview'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// === SSB Report ==============================================================
export const ocSsbReports = pgTable('oc_ssb_reports', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    overallPredictiveRating: integer('overall_predictive_rating'),
    scopeOfImprovement: text('scope_of_improvement'),
});

export const ocSsbPoints = pgTable('oc_ssb_points', {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id').notNull().references(() => ocSsbReports.id, { onDelete: 'cascade' }),
    kind: ssbPointKind('kind').notNull(),                           // POSITIVE / NEGATIVE
    remark: text('remark').notNull(),
    authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
    authorName: varchar('author_name', { length: 160 }),
});

// === Medicals (per semester snapshot) =======================================
export const ocMedicals = pgTable('oc_medicals', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    semester: integer('semester').notNull(),                         // 1..6
    date: timestamp('date', { withTimezone: true }).notNull(),
    age: numeric('age', { mode: 'number' }),
    heightCm: numeric('height_cm', { mode: 'number' }),
    ibwKg: numeric('ibw_kg', { mode: 'number' }),
    abwKg: numeric('abw_kg', { mode: 'number' }),
    overwtPct: numeric('overwt_pct', { mode: 'number' }),
    bmi: numeric('bmi', { mode: 'number' }),
    chestCm: numeric('chest_cm', { mode: 'number' }),
    medicalHistory: text('medical_history'),
    hereditaryIssues: text('hereditary_issues'),
    allergies: text('allergies'),
}, (t) => ({
    semCheck: {
        // CHECK (semester BETWEEN 1 AND 6)
        check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)`,
    },
}));

// === Medical Category (per semester) ========================================
export const ocMedicalCategory = pgTable('oc_medical_category', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    semester: integer('semester').notNull(),
    date: timestamp('date', { withTimezone: true }).notNull(),
    mosAndDiagnostics: text('mos_and_diagnostics'),
    catFrom: timestamp('cat_from', { withTimezone: true }),
    catTo: timestamp('cat_to', { withTimezone: true }),
    mhFrom: timestamp('mh_from', { withTimezone: true }),
    mhTo: timestamp('mh_to', { withTimezone: true }),
    absence: text('absence'),
    platoonCommanderName: varchar('platoon_commander_name', { length: 160 }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
}));

// === Discipline ==============================================================
export const ocDiscipline = pgTable('oc_discipline', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    semester: integer('semester').notNull(),
    dateOfOffence: timestamp('date_of_offence', { withTimezone: true }).notNull(),
    offence: text('offence').notNull(),
    punishmentAwarded: varchar('punishment_awarded', { length: 160 }),  // e.g., restrictions / ED / gating / …
    awardedOn: timestamp('awarded_on', { withTimezone: true }),
    awardedBy: varchar('awarded_by', { length: 160 }),
    numberOfPunishments: integer('number_of_punishments'),
    pointsDelta: integer('points_delta').default(0),                    // e.g., -3, -1, 0
    pointsCumulative: integer('points_cumulative'),                     // optional denorm for quick reads
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
}));

export const ocSprRecords = pgTable('oc_spr_records', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id')
        .notNull()
        .references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    semester: integer('semester').notNull(),
    cdrMarks: numeric('cdr_marks', { mode: 'number' }).notNull().default(0),
    subjectRemarks: jsonb('subject_remarks').$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
    platoonCommanderRemarks: text('platoon_commander_remarks'),
    deputyCommanderRemarks: text('deputy_commander_remarks'),
    commanderRemarks: text('commander_remarks'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqOcSemester: uniqueIndex('uq_oc_spr_record').on(t.enrollmentId, t.semester),
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
    cdrNonNegative: { check: sql`CHECK (${t.cdrMarks.name} >= 0)` },
}));


// === Parent communications ===================================================
export const ocParentComms = pgTable('oc_parent_comms', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    semester: integer('semester').notNull(),
    mode: commModeKind('mode').notNull(),
    refNo: varchar('ref_no', { length: 64 }),
    date: timestamp('date', { withTimezone: true }).notNull(),
    subject: text('subject'),
    brief: text('brief').notNull(),
    platoonCommanderName: varchar('platoon_commander_name', { length: 160 }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
}));

// === Delegation history (when OC moves batch/course) ========================
export const ocDelegations = pgTable('oc_delegations', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    fromCourseId: uuid('from_course_id').notNull().references(() => courses.id, { onDelete: 'restrict' }),
    toCourseId: uuid('to_course_id').notNull().references(() => courses.id, { onDelete: 'restrict' }),
    reason: text('reason'),
    kind: delegationKind('kind').notNull().default('OTHER'),
    decidedOn: timestamp('decided_on', { withTimezone: true }).notNull().defaultNow(),
    decidedByUserId: uuid('decided_by_user_id').references(() => users.id, { onDelete: 'set null' }),
});

// === Training & performance =====================================================
export const ocMotivationAwards = pgTable('oc_motivation_awards', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    semester: integer('semester').notNull(),
    motivationTitle: varchar('motivation_title', { length: 200 }).notNull(),
    fieldName: varchar('field_name', { length: 160 }).notNull(),
    maxMarks: numeric('max_marks', { mode: 'number' }).notNull(),
    marksObtained: numeric('marks_obtained', { mode: 'number' }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
}));

export const ocSportsAndGames = pgTable('oc_sports_and_games', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    semester: integer('semester').notNull(),
    term: termKind('term').notNull(),
    sport: varchar('sport', { length: 160 }).notNull(),
    maxMarks: numeric('max_marks', { mode: 'number' }).notNull(),
    marksObtained: numeric('marks_obtained', { mode: 'number' }).notNull(),
    sportsStrings: text('sports_strings'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
}));

export const ocWeaponTraining = pgTable('oc_weapon_training', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    subject: varchar('subject', { length: 200 }).notNull(),
    semester: integer('semester').notNull(),
    maxMarks: numeric('max_marks', { mode: 'number' }).notNull(),
    marksObtained: numeric('marks_obtained', { mode: 'number' }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
}));

export const ocSpecialAchievementInFiring = pgTable('oc_special_achievement_in_firing', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    achievement: text('achievement').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// === OC Camps (training) ====================================================
export const trainingCamps = pgTable('training_camps', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    semester: campSemesterKind('semester').notNull(),
    maxTotalMarks: integer('max_total_marks').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    uqNameSemester: uniqueIndex('uq_training_camp_name_semester').on(t.name, t.semester),
}));

export const ocCamps = pgTable('oc_camps', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    trainingCampId: uuid('training_camp_id')
        .notNull()
        .references(() => trainingCamps.id, { onDelete: 'restrict' }),
    year: integer('year'),
    totalMarksScored: numeric('total_marks_scored', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    uqOcCamp: uniqueIndex('uq_oc_camp_per_template').on(t.enrollmentId, t.trainingCampId),
}));

export const trainingCampActivities = pgTable('training_camp_activities', {
    id: uuid('id').primaryKey().defaultRandom(),
    trainingCampId: uuid('training_camp_id')
        .notNull()
        .references(() => trainingCamps.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    defaultMaxMarks: integer('default_max_marks').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const ocCampActivityScores = pgTable('oc_camp_activity_scores', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocCampId: uuid('oc_camp_id').notNull().references(() => ocCamps.id, { onDelete: 'cascade' }),
    trainingCampActivityId: uuid('training_camp_activity_id')
        .notNull()
        .references(() => trainingCampActivities.id, { onDelete: 'restrict' }),
    maxMarks: integer('max_marks').notNull(),
    marksScored: integer('marks_scored').notNull(),
    remark: text('remark'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqActivityPerCamp: uniqueIndex('uq_oc_camp_activity').on(t.ocCampId, t.trainingCampActivityId),
    marksWithinBounds: { check: sql`CHECK (${t.marksScored.name} <= ${t.maxMarks.name} AND ${t.marksScored.name} >= 0)` },
}));

export const ocCampReviews = pgTable('oc_camp_reviews', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocCampId: uuid('oc_camp_id').notNull().references(() => ocCamps.id, { onDelete: 'cascade' }),
    role: campReviewRoleKind('role').notNull(),
    sectionTitle: varchar('section_title', { length: 200 }).notNull(),
    reviewText: text('review_text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqReviewRole: uniqueIndex('uq_oc_camp_review_role').on(t.ocCampId, t.role),
}));

export const ocObstacleTraining = pgTable('oc_obstacle_training', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    semester: integer('semester').notNull(),
    obstacle: varchar('obstacle', { length: 160 }).notNull(),
    marksObtained: numeric('marks_obtained', { mode: 'number' }).notNull(),
    remark: text('remark'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 4 AND 6)` },
}));

export const ocSpeedMarch = pgTable('oc_speed_march', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    semester: integer('semester').notNull(),
    test: varchar('test', { length: 160 }).notNull(),
    timings: varchar('timings', { length: 64 }).notNull(),
    marks: numeric('marks', { mode: 'number' }).notNull(),
    remark: text('remark'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 4 AND 6)` },
}));

export const ocDrill = pgTable('oc_drill', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id')
        .notNull()
        .references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    semester: integer('semester').notNull(),
    maxMarks: numeric('max_marks', { mode: 'number' }).notNull(),
    m1Marks: numeric('m1_marks', { mode: 'number' }),
    m2Marks: numeric('m2_marks', { mode: 'number' }),
    a1c1Marks: numeric('a1c1_marks', { mode: 'number' }),
    a2c2Marks: numeric('a2c2_marks', { mode: 'number' }),
    remark: text('remark'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 4 AND 6)` },
}));

// ---------------------------------------------------------------------------
// OLQ (Officer Like Qualities)
// ---------------------------------------------------------------------------
export const ocOlqCategories = pgTable('oc_olq_category', {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'restrict' }),
    code: varchar('code', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqCategoryCodePerCourseActive: uniqueIndex('uq_olq_category_course_code_active')
        .on(t.courseId, t.code)
        .where(sql`${t.isActive} = true`),
    idxCourseActiveOrder: index('idx_olq_category_course_active_order')
        .on(t.courseId, t.isActive, t.displayOrder),
}));

export const ocOlqSubtitles = pgTable('oc_olq_subtitle', {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
        .notNull()
        .references(() => ocOlqCategories.id, { onDelete: 'cascade' }),
    subtitle: varchar('subtitle', { length: 255 }).notNull(),
    maxMarks: integer('max_marks').notNull().default(20),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqSubtitlePerCategory: uniqueIndex('uq_olq_subtitle_per_category').on(t.categoryId, t.subtitle),
}));

export const ocOlq = pgTable('oc_olq', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id')
        .notNull()
        .references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    semester: integer('semester').notNull(),
    totalMarks: integer('total_marks'),
    remarks: text('remarks'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqOcSemester: uniqueIndex('uq_oc_olq_semester').on(t.enrollmentId, t.semester),
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
    idxOcOlqEnrollmentSemester: index('idx_oc_olq_enrollment_sem').on(t.enrollmentId, t.semester),
}));

export const ocOlqScores = pgTable('oc_olq_score', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocOlqId: uuid('oc_olq_id')
        .notNull()
        .references(() => ocOlq.id, { onDelete: 'cascade' }),
    subtitleId: uuid('subtitle_id')
        .notNull()
        .references(() => ocOlqSubtitles.id, { onDelete: 'restrict' }),
    marksScored: integer('marks_scored').notNull().default(0),
}, (t) => ({
    uqScorePerSubtitle: uniqueIndex('uq_olq_score_per_subtitle').on(t.ocOlqId, t.subtitleId),
    marksNonNegative: { check: sql`CHECK (${t.marksScored.name} >= 0)` },
}));

// ---------------------------------------------------------------------------
// oc_credit_for_excellence (CFE)
// ---------------------------------------------------------------------------
export const ocCreditForExcellence = pgTable('oc_credit_for_excellence', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id')
        .notNull()
        .references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    semester: integer('semester').notNull(),
    data: jsonb('data')
        .$type<CreditForExcellenceEntry[]>()
        .notNull(),
    remark: text('remark'),
    sub_category: varchar('sub_category', { length: 160 }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
    uqPerSemester: uniqueIndex('uq_oc_cfe_per_semester').on(t.enrollmentId, t.semester),
}));
// -----------------------------------------------------------------------------
// oc_clubs
// -----------------------------------------------------------------------------
export const ocClubs = pgTable('oc_clubs', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id')
        .notNull()
        .references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    semester: integer('semester').notNull(),
    clubName: varchar('club_name', { length: 160 }).notNull(),
    specialAchievement: text('special_achievement'),
    remark: text('remark'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
}));

// -----------------------------------------------------------------------------
// oc_special_achievement_in_clubs
// -----------------------------------------------------------------------------
export const ocSpecialAchievementInClubs = pgTable('oc_special_achievement_in_clubs', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id')
        .notNull()
        .references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    achievement: text('achievement').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// -----------------------------------------------------------------------------
// oc_recording_leave_hike_detention
// -----------------------------------------------------------------------------
export const ocRecordingLeaveHikeDetention = pgTable('oc_recording_leave_hike_detention', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id')
        .notNull()
        .references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    semester: integer('semester').notNull(),
    reason: text('reason').notNull(),
    type: leaveRecordKind('type').notNull(), // HIKE | LEAVE | DETENTION
    dateFrom: date('date_from').notNull(),
    dateTo: date('date_to').notNull(),
    remark: text('remark'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
}));

// -----------------------------------------------------------------------------
// oc_counselling
// -----------------------------------------------------------------------------
export const ocCounselling = pgTable('oc_counselling', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id')
        .notNull()
        .references(() => ocCadets.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => ocCourseEnrollments.id, { onDelete: 'set null' }),
    semester: integer('semester').notNull(),
    reason: text('reason').notNull(),
    natureOfWarning: counsellingWarningKind('nature_of_warning').notNull(), // RELEGATION | WITHDRAWAL | OTHER
    date: date('date').notNull(),
    warnedBy: varchar('warned_by', { length: 160 }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
}));
