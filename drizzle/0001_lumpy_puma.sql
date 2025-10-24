-- 00xx_oc_schema_guarded.sql
-- Safe, idempotent migration for OC schema

-- ===== Extensions (safe) =====================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== Enums (guarded) =======================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'branch_kind') THEN
    CREATE TYPE public.branch_kind AS ENUM ('O','E','M');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comm_mode_kind') THEN
    CREATE TYPE public.comm_mode_kind AS ENUM ('LETTER','PHONE','EMAIL','IN_PERSON','OTHER');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delegation_kind') THEN
    CREATE TYPE public.delegation_kind AS ENUM ('MEDICAL','DISCIPLINARY','ACADEMIC','ADMIN','OTHER');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oc_status_kind') THEN
    CREATE TYPE public.oc_status_kind AS ENUM ('ACTIVE','DELEGATED','WITHDRAWN','PASSED_OUT');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ssb_point_kind') THEN
    CREATE TYPE public.ssb_point_kind AS ENUM ('POSITIVE','NEGATIVE');
  END IF;
END$$;

-- ===== Tables (guarded) ======================================================
DO $$
BEGIN
  IF to_regclass('public.courses') IS NULL THEN
    CREATE TABLE public.courses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      code varchar(32) NOT NULL,
      name varchar(128) NOT NULL,
      start_date timestamptz,
      expected_end_date timestamptz,
      notes text
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_cadets') IS NULL THEN
    CREATE TABLE public.oc_cadets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      oc_no varchar(32) NOT NULL,
      uid varchar(64) NOT NULL,
      name varchar(160) NOT NULL,
      course_id uuid NOT NULL,
      branch public.branch_kind DEFAULT 'O',
      platoon_id uuid,
      arrival_at_university timestamptz NOT NULL,
      status public.oc_status_kind DEFAULT 'ACTIVE' NOT NULL,
      manager_user_id uuid,
      relegated_to_course_id uuid,
      relegated_on timestamptz,
      withdrawn_on timestamptz,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_personal') IS NULL THEN
    CREATE TABLE public.oc_personal (
      oc_id uuid PRIMARY KEY NOT NULL,
      visible_ident_marks text,
      pi varchar(64),
      dob timestamptz,
      place_of_birth varchar(128),
      domicile varchar(128),
      religion varchar(64),
      nationality varchar(64),
      blood_group varchar(8),
      ident_marks text,
      mobile_no varchar(32),
      email varchar(255),
      passport_no varchar(64),
      pan_no varchar(20),
      aadhaar_no varchar(16),
      father_name varchar(160),
      father_mobile varchar(32),
      father_addr_permanent text,
      father_addr_present text,
      father_profession varchar(128),
      guardian_name varchar(160),
      guardian_address text,
      monthly_income integer,
      nok_details text,
      nok_addr_perm text,
      nok_addr_present text,
      nearest_railway_station varchar(128),
      family_in_secunderabad text,
      relative_in_armed_forces text,
      govt_financial_assistance boolean DEFAULT false,
      bank_details text,
      iden_card_no varchar(64),
      upsc_roll_no varchar(32),
      ssb_centre varchar(64),
      games text,
      hobbies text,
      is_swimmer boolean,
      languages text,
      ds_pi_ss_ic_no varchar(64),
      ds_pi_rank varchar(64),
      ds_pi_name varchar(160),
      ds_pi_unit_arm varchar(160),
      ds_pi_mobile varchar(32),
      ds_dy_ic_no varchar(64),
      ds_dy_rank varchar(64),
      ds_dy_name varchar(160),
      ds_dy_unit_arm varchar(160),
      ds_dy_mobile varchar(32),
      ds_cdr_ic_no varchar(64),
      ds_cdr_rank varchar(64),
      ds_cdr_name varchar(160),
      ds_cdr_unit_arm varchar(160),
      ds_cdr_mobile varchar(32)
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_pre_commission') IS NULL THEN
    CREATE TABLE public.oc_pre_commission (
      oc_id uuid PRIMARY KEY NOT NULL,
      course_id uuid NOT NULL,
      branch public.branch_kind DEFAULT 'O',
      platoon_id uuid,
      relegated_to_course_id uuid,
      relegated_on timestamptz,
      withdrawn_on timestamptz
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_commissioning') IS NULL THEN
    CREATE TABLE public.oc_commissioning (
      oc_id uuid PRIMARY KEY NOT NULL,
      pass_out_date timestamptz,
      ic_no varchar(48),
      order_of_merit integer,
      regiment_or_arm varchar(128),
      posted_unit text
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_delegations') IS NULL THEN
    CREATE TABLE public.oc_delegations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      oc_id uuid NOT NULL,
      from_course_id uuid NOT NULL,
      to_course_id uuid NOT NULL,
      reason text,
      kind public.delegation_kind DEFAULT 'OTHER' NOT NULL,
      decided_on timestamptz DEFAULT now() NOT NULL,
      decided_by_user_id uuid
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_education') IS NULL THEN
    CREATE TABLE public.oc_education (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      oc_id uuid NOT NULL,
      level varchar(64) NOT NULL,
      school_or_college varchar(160) NOT NULL,
      board_or_univ varchar(160),
      subjects text,
      total_percent integer,
      per_subject text
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_family_members') IS NULL THEN
    CREATE TABLE public.oc_family_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      oc_id uuid NOT NULL,
      name varchar(160) NOT NULL,
      relation varchar(64) NOT NULL,
      age integer,
      occupation varchar(128),
      education varchar(128),
      mobile_no varchar(32)
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_medicals') IS NULL THEN
    CREATE TABLE public.oc_medicals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      oc_id uuid NOT NULL,
      semester integer NOT NULL,
      date timestamptz NOT NULL,
      age integer,
      height_cm integer,
      ibw_kg integer,
      abw_kg integer,
      overwt_pct integer,
      bmi integer,
      chest_cm integer,
      medical_history text,
      hereditary_issues text,
      allergies text
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_medical_category') IS NULL THEN
    CREATE TABLE public.oc_medical_category (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      oc_id uuid NOT NULL,
      semester integer NOT NULL,
      date timestamptz NOT NULL,
      mos_and_diagnostics text,
      cat_from timestamptz,
      cat_to timestamptz,
      mh_from timestamptz,
      mh_to timestamptz,
      absence text,
      platoon_commander_name varchar(160)
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_discipline') IS NULL THEN
    CREATE TABLE public.oc_discipline (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      oc_id uuid NOT NULL,
      semester integer NOT NULL,
      date_of_offence timestamptz NOT NULL,
      offence text NOT NULL,
      punishment_awarded varchar(160),
      awarded_on timestamptz,
      awarded_by varchar(160),
      points_delta integer DEFAULT 0,
      points_cumulative integer
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_parent_comms') IS NULL THEN
    CREATE TABLE public.oc_parent_comms (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      oc_id uuid NOT NULL,
      semester integer NOT NULL,
      mode public.comm_mode_kind NOT NULL,
      letter_no varchar(64),
      date timestamptz NOT NULL,
      brief text NOT NULL,
      platoon_commander_name varchar(160)
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_autobiography') IS NULL THEN
    CREATE TABLE public.oc_autobiography (
      oc_id uuid PRIMARY KEY NOT NULL,
      general_self text,
      proficiency_sports text,
      achievements_note text,
      areas_to_work text,
      additional_info text,
      filled_on timestamptz,
      platoon_commander_name varchar(160)
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_ssb_reports') IS NULL THEN
    CREATE TABLE public.oc_ssb_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      oc_id uuid NOT NULL,
      overall_predictive_rating integer,
      scope_of_improvement text
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_ssb_points') IS NULL THEN
    CREATE TABLE public.oc_ssb_points (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      report_id uuid NOT NULL,
      kind public.ssb_point_kind NOT NULL,
      remark text NOT NULL,
      author_user_id uuid,
      author_name varchar(160)
    );
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.oc_achievements') IS NULL THEN
    CREATE TABLE public.oc_achievements (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      oc_id uuid NOT NULL,
      event varchar(160) NOT NULL,
      year integer,
      level varchar(64),
      prize varchar(128)
    );
  END IF;
END$$;

-- ===== Foreign Keys (guarded) ===============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_achievements_oc_id_oc_cadets_id_fk') THEN
    ALTER TABLE public.oc_achievements
      ADD CONSTRAINT oc_achievements_oc_id_oc_cadets_id_fk
      FOREIGN KEY (oc_id) REFERENCES public.oc_cadets(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_autobiography_oc_id_oc_cadets_id_fk') THEN
    ALTER TABLE public.oc_autobiography
      ADD CONSTRAINT oc_autobiography_oc_id_oc_cadets_id_fk
      FOREIGN KEY (oc_id) REFERENCES public.oc_cadets(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_cadets_course_id_courses_id_fk') THEN
    ALTER TABLE public.oc_cadets
      ADD CONSTRAINT oc_cadets_course_id_courses_id_fk
      FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_cadets_platoon_id_platoons_id_fk') THEN
    ALTER TABLE public.oc_cadets
      ADD CONSTRAINT oc_cadets_platoon_id_platoons_id_fk
      FOREIGN KEY (platoon_id) REFERENCES public.platoons(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_cadets_manager_user_id_users_id_fk') THEN
    ALTER TABLE public.oc_cadets
      ADD CONSTRAINT oc_cadets_manager_user_id_users_id_fk
      FOREIGN KEY (manager_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_cadets_relegated_to_course_id_courses_id_fk') THEN
    ALTER TABLE public.oc_cadets
      ADD CONSTRAINT oc_cadets_relegated_to_course_id_courses_id_fk
      FOREIGN KEY (relegated_to_course_id) REFERENCES public.courses(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_commissioning_oc_id_oc_cadets_id_fk') THEN
    ALTER TABLE public.oc_commissioning
      ADD CONSTRAINT oc_commissioning_oc_id_oc_cadets_id_fk
      FOREIGN KEY (oc_id) REFERENCES public.oc_cadets(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_delegations_oc_id_oc_cadets_id_fk') THEN
    ALTER TABLE public.oc_delegations
      ADD CONSTRAINT oc_delegations_oc_id_oc_cadets_id_fk
      FOREIGN KEY (oc_id) REFERENCES public.oc_cadets(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_delegations_from_course_id_courses_id_fk') THEN
    ALTER TABLE public.oc_delegations
      ADD CONSTRAINT oc_delegations_from_course_id_courses_id_fk
      FOREIGN KEY (from_course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_delegations_to_course_id_courses_id_fk') THEN
    ALTER TABLE public.oc_delegations
      ADD CONSTRAINT oc_delegations_to_course_id_courses_id_fk
      FOREIGN KEY (to_course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_delegations_decided_by_user_id_users_id_fk') THEN
    ALTER TABLE public.oc_delegations
      ADD CONSTRAINT oc_delegations_decided_by_user_id_users_id_fk
      FOREIGN KEY (decided_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_discipline_oc_id_oc_cadets_id_fk') THEN
    ALTER TABLE public.oc_discipline
      ADD CONSTRAINT oc_discipline_oc_id_oc_cadets_id_fk
      FOREIGN KEY (oc_id) REFERENCES public.oc_cadets(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_education_oc_id_oc_cadets_id_fk') THEN
    ALTER TABLE public.oc_education
      ADD CONSTRAINT oc_education_oc_id_oc_cadets_id_fk
      FOREIGN KEY (oc_id) REFERENCES public.oc_cadets(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_family_members_oc_id_oc_cadets_id_fk') THEN
    ALTER TABLE public.oc_family_members
      ADD CONSTRAINT oc_family_members_oc_id_oc_cadets_id_fk
      FOREIGN KEY (oc_id) REFERENCES public.oc_cadets(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_medical_category_oc_id_oc_cadets_id_fk') THEN
    ALTER TABLE public.oc_medical_category
      ADD CONSTRAINT oc_medical_category_oc_id_oc_cadets_id_fk
      FOREIGN KEY (oc_id) REFERENCES public.oc_cadets(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_medicals_oc_id_oc_cadets_id_fk') THEN
    ALTER TABLE public.oc_medicals
      ADD CONSTRAINT oc_medicals_oc_id_oc_cadets_id_fk
      FOREIGN KEY (oc_id) REFERENCES public.oc_cadets(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_parent_comms_oc_id_oc_cadets_id_fk') THEN
    ALTER TABLE public.oc_parent_comms
      ADD CONSTRAINT oc_parent_comms_oc_id_oc_cadets_id_fk
      FOREIGN KEY (oc_id) REFERENCES public.oc_cadets(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_personal_oc_id_oc_cadets_id_fk') THEN
    ALTER TABLE public.oc_personal
      ADD CONSTRAINT oc_personal_oc_id_oc_cadets_id_fk
      FOREIGN KEY (oc_id) REFERENCES public.oc_cadets(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_pre_commission_oc_id_oc_cadets_id_fk') THEN
    ALTER TABLE public.oc_pre_commission
      ADD CONSTRAINT oc_pre_commission_oc_id_oc_cadets_id_fk
      FOREIGN KEY (oc_id) REFERENCES public.oc_cadets(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_pre_commission_course_id_courses_id_fk') THEN
    ALTER TABLE public.oc_pre_commission
      ADD CONSTRAINT oc_pre_commission_course_id_courses_id_fk
      FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_pre_commission_platoon_id_platoons_id_fk') THEN
    ALTER TABLE public.oc_pre_commission
      ADD CONSTRAINT oc_pre_commission_platoon_id_platoons_id_fk
      FOREIGN KEY (platoon_id) REFERENCES public.platoons(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_pre_commission_relegated_to_course_id_courses_id_fk') THEN
    ALTER TABLE public.oc_pre_commission
      ADD CONSTRAINT oc_pre_commission_relegated_to_course_id_courses_id_fk
      FOREIGN KEY (relegated_to_course_id) REFERENCES public.courses(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_ssb_points_report_id_oc_ssb_reports_id_fk') THEN
    ALTER TABLE public.oc_ssb_points
      ADD CONSTRAINT oc_ssb_points_report_id_oc_ssb_reports_id_fk
      FOREIGN KEY (report_id) REFERENCES public.oc_ssb_reports(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_ssb_points_author_user_id_users_id_fk') THEN
    ALTER TABLE public.oc_ssb_points
      ADD CONSTRAINT oc_ssb_points_author_user_id_users_id_fk
      FOREIGN KEY (author_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_ssb_reports_oc_id_oc_cadets_id_fk') THEN
    ALTER TABLE public.oc_ssb_reports
      ADD CONSTRAINT oc_ssb_reports_oc_id_oc_cadets_id_fk
      FOREIGN KEY (oc_id) REFERENCES public.oc_cadets(id) ON DELETE CASCADE;
  END IF;
END$$;

-- ===== Indexes (guarded) =====================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_courses_code ON public.courses USING btree (code);

-- (Optional but recommended) Uniques on cadet identifiers:
CREATE UNIQUE INDEX IF NOT EXISTS uq_oc_cadets_oc_no ON public.oc_cadets(oc_no);
CREATE UNIQUE INDEX IF NOT EXISTS uq_oc_cadets_uid   ON public.oc_cadets(uid);
