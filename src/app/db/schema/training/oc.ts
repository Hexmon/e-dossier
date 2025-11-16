import { pgTable, uuid, varchar, timestamp, text, integer, boolean, numeric } from 'drizzle-orm/pg-core';
import { branchKind, ocStatusKind, commModeKind, ssbPointKind, delegationKind, termKind } from './enums';
import { courses } from './courses';
import { subjects } from './subjects';
import { platoons } from '@/app/db/schema/auth/platoons';
import { users } from '@/app/db/schema/auth/users';
import { sql } from 'drizzle-orm';

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
    totalPercent: integer('total_percent'),
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
    age: integer('age'),
    heightCm: integer('height_cm'),
    ibwKg: integer('ibw_kg'),
    abwKg: integer('abw_kg'),
    overwtPct: integer('overwt_pct'),
    bmi: integer('bmi'),
    chestCm: integer('chest_cm'),
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
    semester: integer('semester').notNull(),
    dateOfOffence: timestamp('date_of_offence', { withTimezone: true }).notNull(),
    offence: text('offence').notNull(),
    punishmentAwarded: varchar('punishment_awarded', { length: 160 }),  // e.g., restrictions / ED / gating / …
    awardedOn: timestamp('awarded_on', { withTimezone: true }),
    awardedBy: varchar('awarded_by', { length: 160 }),
    pointsDelta: integer('points_delta').default(0),                    // e.g., -3, -1, 0
    pointsCumulative: integer('points_cumulative'),                     // optional denorm for quick reads
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
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
    semester: integer('semester').notNull(),
    term: termKind('term').notNull(),
    sport: varchar('sport', { length: 160 }).notNull(),
    maxMarks: numeric('max_marks').notNull(),
    marksObtained: numeric('marks_obtained').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
}));

export const ocWeaponTraining = pgTable('oc_weapon_training', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    subject: varchar('subject', { length: 200 }).notNull(),
    semester: integer('semester').notNull(),
    maxMarks: numeric('max_marks').notNull(),
    marksObtained: numeric('marks_obtained').notNull(),
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

export const ocObstacleTraining = pgTable('oc_obstacle_training', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    semester: integer('semester').notNull(),
    obstacle: varchar('obstacle', { length: 160 }).notNull(),
    marksObtained: numeric('marks_obtained').notNull(),
    remark: text('remark'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 4 AND 6)` },
}));

export const ocSpeedMarch = pgTable('oc_speed_march', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    semester: integer('semester').notNull(),
    test: varchar('test', { length: 160 }).notNull(),
    timings: varchar('timings', { length: 64 }).notNull(),
    marks: numeric('marks').notNull(),
    remark: text('remark'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 4 AND 6)` },
}));
