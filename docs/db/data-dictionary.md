# Database Data Dictionary

Generated at: `2026-02-22T21:08:53.877Z`
Database: `neondb`
Server version: `PostgreSQL 17.8 (6108b59) on aarch64-unknown-linux-gnu, compiled by gcc (Debian 12.2.0-14+deb12u1) 12.2.0, 64-bit`

## Table of Contents

- [Schema `drizzle`](#schema-drizzle)
  - [`drizzle.__drizzle_migrations`](#table-drizzle-drizzle-migrations)
- [Schema `public`](#schema-public)
  - [`public.account_lockouts`](#table-public-account-lockouts)
  - [`public.appointment_transfers`](#table-public-appointment-transfers)
  - [`public.appointments`](#table-public-appointments)
  - [`public.audit_events`](#table-public-audit-events)
  - [`public.audit_logs`](#table-public-audit-logs)
  - [`public.authz_policy_state`](#table-public-authz-policy-state)
  - [`public.course_offering_instructors`](#table-public-course-offering-instructors)
  - [`public.course_offerings`](#table-public-course-offerings)
  - [`public.courses`](#table-public-courses)
  - [`public.credentials_local`](#table-public-credentials-local)
  - [`public.delegations`](#table-public-delegations)
  - [`public.device_site_settings`](#table-public-device-site-settings)
  - [`public.dossier_inspections`](#table-public-dossier-inspections)
  - [`public.instructors`](#table-public-instructors)
  - [`public.interview_template_field_options`](#table-public-interview-template-field-options)
  - [`public.interview_template_fields`](#table-public-interview-template-fields)
  - [`public.interview_template_groups`](#table-public-interview-template-groups)
  - [`public.interview_template_sections`](#table-public-interview-template-sections)
  - [`public.interview_template_semesters`](#table-public-interview-template-semesters)
  - [`public.interview_templates`](#table-public-interview-templates)
  - [`public.login_attempts`](#table-public-login-attempts)
  - [`public.oc_achievements`](#table-public-oc-achievements)
  - [`public.oc_autobiography`](#table-public-oc-autobiography)
  - [`public.oc_cadets`](#table-public-oc-cadets)
  - [`public.oc_camp_activity_scores`](#table-public-oc-camp-activity-scores)
  - [`public.oc_camp_reviews`](#table-public-oc-camp-reviews)
  - [`public.oc_camps`](#table-public-oc-camps)
  - [`public.oc_clubs`](#table-public-oc-clubs)
  - [`public.oc_commissioning`](#table-public-oc-commissioning)
  - [`public.oc_counselling`](#table-public-oc-counselling)
  - [`public.oc_course_enrollments`](#table-public-oc-course-enrollments)
  - [`public.oc_credit_for_excellence`](#table-public-oc-credit-for-excellence)
  - [`public.oc_delegations`](#table-public-oc-delegations)
  - [`public.oc_discipline`](#table-public-oc-discipline)
  - [`public.oc_dossier_filling`](#table-public-oc-dossier-filling)
  - [`public.oc_drill`](#table-public-oc-drill)
  - [`public.oc_education`](#table-public-oc-education)
  - [`public.oc_family_members`](#table-public-oc-family-members)
  - [`public.oc_images`](#table-public-oc-images)
  - [`public.oc_interview_field_values`](#table-public-oc-interview-field-values)
  - [`public.oc_interview_group_rows`](#table-public-oc-interview-group-rows)
  - [`public.oc_interview_group_values`](#table-public-oc-interview-group-values)
  - [`public.oc_interviews`](#table-public-oc-interviews)
  - [`public.oc_medical_category`](#table-public-oc-medical-category)
  - [`public.oc_medicals`](#table-public-oc-medicals)
  - [`public.oc_motivation_awards`](#table-public-oc-motivation-awards)
  - [`public.oc_obstacle_training`](#table-public-oc-obstacle-training)
  - [`public.oc_olq`](#table-public-oc-olq)
  - [`public.oc_olq_category`](#table-public-oc-olq-category)
  - [`public.oc_olq_score`](#table-public-oc-olq-score)
  - [`public.oc_olq_subtitle`](#table-public-oc-olq-subtitle)
  - [`public.oc_parent_comms`](#table-public-oc-parent-comms)
  - [`public.oc_personal`](#table-public-oc-personal)
  - [`public.oc_pre_commission`](#table-public-oc-pre-commission)
  - [`public.oc_pt_motivation_awards`](#table-public-oc-pt-motivation-awards)
  - [`public.oc_pt_task_scores`](#table-public-oc-pt-task-scores)
  - [`public.oc_recording_leave_hike_detention`](#table-public-oc-recording-leave-hike-detention)
  - [`public.oc_relegations`](#table-public-oc-relegations)
  - [`public.oc_semester_marks`](#table-public-oc-semester-marks)
  - [`public.oc_special_achievement_in_clubs`](#table-public-oc-special-achievement-in-clubs)
  - [`public.oc_special_achievement_in_firing`](#table-public-oc-special-achievement-in-firing)
  - [`public.oc_speed_march`](#table-public-oc-speed-march)
  - [`public.oc_sports_and_games`](#table-public-oc-sports-and-games)
  - [`public.oc_spr_records`](#table-public-oc-spr-records)
  - [`public.oc_ssb_points`](#table-public-oc-ssb-points)
  - [`public.oc_ssb_reports`](#table-public-oc-ssb-reports)
  - [`public.oc_weapon_training`](#table-public-oc-weapon-training)
  - [`public.permission_field_rules`](#table-public-permission-field-rules)
  - [`public.permissions`](#table-public-permissions)
  - [`public.platoons`](#table-public-platoons)
  - [`public.position_permissions`](#table-public-position-permissions)
  - [`public.positions`](#table-public-positions)
  - [`public.pt_attempt_grades`](#table-public-pt-attempt-grades)
  - [`public.pt_motivation_award_fields`](#table-public-pt-motivation-award-fields)
  - [`public.pt_task_scores`](#table-public-pt-task-scores)
  - [`public.pt_tasks`](#table-public-pt-tasks)
  - [`public.pt_type_attempts`](#table-public-pt-type-attempts)
  - [`public.pt_types`](#table-public-pt-types)
  - [`public.punishments`](#table-public-punishments)
  - [`public.role_permissions`](#table-public-role-permissions)
  - [`public.roles`](#table-public-roles)
  - [`public.signup_requests`](#table-public-signup-requests)
  - [`public.site_awards`](#table-public-site-awards)
  - [`public.site_commanders`](#table-public-site-commanders)
  - [`public.site_history`](#table-public-site-history)
  - [`public.site_settings`](#table-public-site-settings)
  - [`public.subjects`](#table-public-subjects)
  - [`public.training_camp_activities`](#table-public-training-camp-activities)
  - [`public.training_camps`](#table-public-training-camps)
  - [`public.users`](#table-public-users)

## Schema: `drizzle`
<a id="schema-drizzle"></a>

### Table: `drizzle.__drizzle_migrations`
<a id="table-drizzle-drizzle-migrations"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | integer | NO | nextval('drizzle.__drizzle_migrations_id_seq'::regclass) | NO | - |
| hash | text | NO | - | NO | - |
| created_at | bigint | YES | - | NO | - |

#### Primary Key

- Name: `__drizzle_migrations_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `__drizzle_migrations_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Enums

_None_

## Schema: `public`
<a id="schema-public"></a>

### Table: `public.account_lockouts`
<a id="table-public-account-lockouts"></a>

Type: `BASE TABLE`

Comment: Tracks account lockouts after multiple failed login attempts

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| user_id | uuid | NO | - | NO | - |
| locked_at | timestamp with time zone | NO | now() | NO | - |
| locked_until | timestamp with time zone | NO | - | NO | - |
| failed_attempts | integer | NO | 0 | NO | - |
| ip_address | character varying(64) | YES | - | NO | - |
| unlocked | boolean | NO | false | NO | - |
| unlocked_at | timestamp with time zone | YES | - | NO | - |
| unlocked_by | uuid | YES | - | NO | - |
| reason | character varying(255) | YES | - | NO | - |

#### Primary Key

- Name: `account_lockouts_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `account_lockouts_unlocked_by_users_id_fk`: (`unlocked_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `account_lockouts_user_id_users_id_fk`: (`user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `account_lockouts_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.appointment_transfers`
<a id="table-public-appointment-transfers"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| from_appointment_id | uuid | NO | - | NO | - |
| to_appointment_id | uuid | NO | - | NO | - |
| from_user_id | uuid | NO | - | NO | - |
| to_user_id | uuid | NO | - | NO | - |
| position_id | uuid | NO | - | NO | - |
| scope_type | text | NO | - | NO | - |
| scope_id | uuid | YES | - | NO | - |
| prev_starts_at | timestamp with time zone | NO | - | NO | - |
| prev_ends_at | timestamp with time zone | NO | - | NO | - |
| new_starts_at | timestamp with time zone | NO | - | NO | - |
| reason | text | YES | - | NO | - |
| transferred_by | uuid | NO | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `appointment_transfers_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `appointment_transfers_from_appointment_id_appointments_id_fk`: (`from_appointment_id`) -> `public.appointments` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `appointment_transfers_from_user_id_users_id_fk`: (`from_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `appointment_transfers_position_id_positions_id_fk`: (`position_id`) -> `public.positions` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `appointment_transfers_to_appointment_id_appointments_id_fk`: (`to_appointment_id`) -> `public.appointments` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `appointment_transfers_to_user_id_users_id_fk`: (`to_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `appointment_transfers_transferred_by_users_id_fk`: (`transferred_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]

#### Indexes

- `appointment_transfers_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.appointments`
<a id="table-public-appointments"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| user_id | uuid | NO | - | NO | - |
| position_id | uuid | NO | - | NO | - |
| assignment | assignment_kind | NO | 'PRIMARY'::assignment_kind | NO | - |
| scope_type | scope_type | NO | 'GLOBAL'::scope_type | NO | - |
| scope_id | uuid | YES | - | NO | - |
| starts_at | timestamp with time zone | NO | - | NO | - |
| ends_at | timestamp with time zone | YES | - | NO | - |
| appointed_by | uuid | YES | - | NO | - |
| ended_by | uuid | YES | - | NO | - |
| reason | text | YES | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `appointments_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `appointments_appointed_by_users_id_fk`: (`appointed_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `appointments_ended_by_users_id_fk`: (`ended_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `appointments_position_id_positions_id_fk`: (`position_id`) -> `public.positions` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `appointments_user_id_users_id_fk`: (`user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: RESTRICT]

#### Indexes

- `appointments_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.audit_events`
<a id="table-public-audit-events"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| event_id | text | NO | - | NO | - |
| schema_version | integer | NO | - | NO | - |
| occurred_at | timestamp with time zone | NO | - | NO | - |
| action | text | NO | - | NO | - |
| outcome | text | NO | - | NO | - |
| actor_id | text | NO | - | NO | - |
| actor_type | text | NO | - | NO | - |
| actor_display_name | text | YES | - | NO | - |
| actor_roles | text[] | YES | - | NO | - |
| actor_ip | text | YES | - | NO | - |
| actor_user_agent | text | YES | - | NO | - |
| target_id | text | YES | - | NO | - |
| target_type | text | YES | - | NO | - |
| target_display_name | text | YES | - | NO | - |
| tenant_id | text | YES | - | NO | - |
| org_id | text | YES | - | NO | - |
| target | jsonb | YES | - | NO | - |
| context | jsonb | YES | - | NO | - |
| metadata | jsonb | YES | - | NO | - |
| diff | jsonb | YES | - | NO | - |
| integrity | jsonb | YES | - | NO | - |
| retention_tag | text | YES | - | NO | - |
| metadata_truncated | boolean | YES | false | NO | - |
| diff_truncated | boolean | YES | false | NO | - |

#### Primary Key

- Name: `audit_events_pkey`
- Columns: `event_id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `audit_events_pkey` (UNIQUE, PRIMARY) using `btree` on `event_id`

### Table: `public.audit_logs`
<a id="table-public-audit-logs"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| actor_user_id | uuid | YES | - | NO | - |
| event_type | character varying(96) | NO | - | NO | - |
| resource_type | character varying(96) | NO | - | NO | - |
| resource_id | uuid | YES | - | NO | - |
| description | text | YES | - | NO | - |
| metadata | jsonb | YES | - | NO | - |
| ip_addr | character varying(64) | YES | - | NO | - |
| user_agent | text | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| tenant_id | uuid | YES | - | NO | - |
| method | character varying(16) | YES | - | NO | - |
| path | character varying(512) | YES | - | NO | - |
| status_code | integer | YES | - | NO | - |
| outcome | character varying(32) | YES | - | NO | - |
| request_id | uuid | YES | - | NO | - |
| changed_fields | text[] | YES | - | NO | - |
| diff | jsonb | YES | - | NO | - |

#### Primary Key

- Name: `audit_logs_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `audit_logs_actor_user_id_users_id_fk`: (`actor_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]

#### Indexes

- `audit_logs_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.authz_policy_state`
<a id="table-public-authz-policy-state"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| key | character varying(64) | NO | - | NO | - |
| version | integer | NO | 1 | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `authz_policy_state_pkey`
- Columns: `key`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `authz_policy_state_pkey` (UNIQUE, PRIMARY) using `btree` on `key`

### Table: `public.course_offering_instructors`
<a id="table-public-course-offering-instructors"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| offering_id | uuid | NO | - | NO | - |
| instructor_id | uuid | NO | - | NO | - |
| role | character varying(24) | NO | 'PRIMARY'::character varying | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `course_offering_instructors_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `course_offering_instructors_instructor_id_instructors_id_fk`: (`instructor_id`) -> `public.instructors` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `course_offering_instructors_offering_id_course_offerings_id_fk`: (`offering_id`) -> `public.course_offerings` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `course_offering_instructors_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_offering_instructor` (UNIQUE) using `btree` on `offering_id`, `instructor_id`

### Table: `public.course_offerings`
<a id="table-public-course-offerings"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| course_id | uuid | NO | - | NO | - |
| semester | smallint | NO | - | NO | - |
| subject_id | uuid | NO | - | NO | - |
| include_theory | boolean | NO | true | NO | - |
| include_practical | boolean | NO | false | NO | - |
| theory_credits | integer | YES | - | NO | - |
| practical_credits | integer | YES | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `course_offerings_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `course_offerings_course_id_courses_id_fk`: (`course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `course_offerings_subject_id_subjects_id_fk`: (`subject_id`) -> `public.subjects` (`id`) [on update: NO ACTION, on delete: RESTRICT]

#### Indexes

- `course_offerings_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_course_offering` (UNIQUE) using `btree` on `course_id`, `subject_id`, `semester`

### Table: `public.courses`
<a id="table-public-courses"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| code | character varying(32) | NO | - | NO | - |
| title | character varying(160) | NO | - | NO | - |
| notes | text | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `courses_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `courses_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_courses_code_active` (UNIQUE) using `btree` on `code`

### Table: `public.credentials_local`
<a id="table-public-credentials-local"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| user_id | uuid | NO | - | NO | - |
| password_hash | text | NO | - | NO | - |
| password_algo | text | NO | 'argon2id'::text | NO | - |
| password_updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `credentials_local_pkey`
- Columns: `user_id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `credentials_local_user_id_users_id_fk`: (`user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: RESTRICT]

#### Indexes

- `credentials_local_pkey` (UNIQUE, PRIMARY) using `btree` on `user_id`

### Table: `public.delegations`
<a id="table-public-delegations"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| grantor_user_id | uuid | NO | - | NO | - |
| grantee_user_id | uuid | NO | - | NO | - |
| act_as_position_id | uuid | YES | - | NO | - |
| scope_type | scope_type | NO | 'GLOBAL'::scope_type | NO | - |
| scope_id | uuid | YES | - | NO | - |
| starts_at | timestamp with time zone | NO | - | NO | - |
| ends_at | timestamp with time zone | YES | - | NO | - |
| reason | text | YES | - | NO | - |
| terminated_by | uuid | YES | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `delegations_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `delegations_act_as_position_id_positions_id_fk`: (`act_as_position_id`) -> `public.positions` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `delegations_grantee_user_id_users_id_fk`: (`grantee_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `delegations_grantor_user_id_users_id_fk`: (`grantor_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `delegations_scope_id_platoons_id_fk`: (`scope_id`) -> `public.platoons` (`id`) [on update: NO ACTION, on delete: NO ACTION]
- `delegations_terminated_by_users_id_fk`: (`terminated_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]

#### Indexes

- `delegations_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.device_site_settings`
<a id="table-public-device-site-settings"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| device_id | character varying(128) | NO | - | NO | - |
| theme | character varying(16) | NO | 'system'::character varying | NO | - |
| language | character varying(16) | NO | 'en'::character varying | NO | - |
| timezone | character varying(64) | NO | 'Asia/Kolkata'::character varying | NO | - |
| refresh_interval | integer | NO | 60 | NO | - |
| layout_density | character varying(16) | NO | 'comfortable'::character varying | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| updated_by | uuid | YES | - | NO | - |
| theme_preset | character varying(32) | NO | 'navy-steel'::character varying | NO | - |
| accent_palette | character varying(16) | NO | 'blue'::character varying | NO | - |

#### Primary Key

- Name: `device_site_settings_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `device_site_settings_updated_by_users_id_fk`: (`updated_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]

#### Indexes

- `device_site_settings_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `ux_device_site_settings_device_id` (UNIQUE) using `btree` on `device_id`

### Table: `public.dossier_inspections`
<a id="table-public-dossier-inspections"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| inspector_user_id | uuid | NO | - | NO | - |
| date | timestamp with time zone | NO | - | NO | - |
| remarks | text | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `dossier_inspections_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `dossier_inspections_inspector_user_id_users_id_fk`: (`inspector_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `dossier_inspections_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `dossier_inspections_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.instructors`
<a id="table-public-instructors"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| user_id | uuid | YES | - | NO | - |
| name | character varying(160) | NO | - | NO | - |
| email | character varying(255) | YES | - | NO | - |
| phone | character varying(32) | YES | - | NO | - |
| affiliation | character varying(160) | YES | - | NO | - |
| notes | text | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `instructors_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `instructors_user_id_users_id_fk`: (`user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]

#### Indexes

- `instructors_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.interview_template_field_options`
<a id="table-public-interview-template-field-options"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| field_id | uuid | NO | - | NO | - |
| code | character varying(32) | NO | - | NO | - |
| label | character varying(160) | NO | - | NO | - |
| sort_order | integer | NO | 0 | NO | - |
| is_active | boolean | NO | true | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `interview_template_field_options_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `interview_template_field_options_field_id_interview_template_fi`: (`field_id`) -> `public.interview_template_fields` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `interview_template_field_options_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_interview_field_option_code` (UNIQUE) using `btree` on `field_id`, `code`

### Table: `public.interview_template_fields`
<a id="table-public-interview-template-fields"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| template_id | uuid | NO | - | NO | - |
| section_id | uuid | YES | - | NO | - |
| group_id | uuid | YES | - | NO | - |
| key | character varying(64) | NO | - | NO | - |
| label | character varying(160) | NO | - | NO | - |
| field_type | character varying(32) | NO | - | NO | - |
| required | boolean | NO | false | NO | - |
| help_text | text | YES | - | NO | - |
| max_length | integer | YES | - | NO | - |
| sort_order | integer | NO | 0 | NO | - |
| is_active | boolean | NO | true | NO | - |
| capture_filed_at | boolean | NO | true | NO | - |
| capture_signature | boolean | NO | false | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `interview_template_fields_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `interview_template_fields_group_id_interview_template_groups_id`: (`group_id`) -> `public.interview_template_groups` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `interview_template_fields_section_id_interview_template_section`: (`section_id`) -> `public.interview_template_sections` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `interview_template_fields_template_id_interview_templates_id_fk`: (`template_id`) -> `public.interview_templates` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `interview_template_fields_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_interview_template_field_key` (UNIQUE) using `btree` on `template_id`, `key`

### Table: `public.interview_template_groups`
<a id="table-public-interview-template-groups"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| template_id | uuid | NO | - | NO | - |
| section_id | uuid | YES | - | NO | - |
| title | character varying(160) | NO | - | NO | - |
| min_rows | integer | NO | 0 | NO | - |
| max_rows | integer | YES | - | NO | - |
| sort_order | integer | NO | 0 | NO | - |
| is_active | boolean | NO | true | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `interview_template_groups_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `interview_template_groups_section_id_interview_template_section`: (`section_id`) -> `public.interview_template_sections` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `interview_template_groups_template_id_interview_templates_id_fk`: (`template_id`) -> `public.interview_templates` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `interview_template_groups_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.interview_template_sections`
<a id="table-public-interview-template-sections"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| template_id | uuid | NO | - | NO | - |
| title | character varying(160) | NO | - | NO | - |
| description | text | YES | - | NO | - |
| sort_order | integer | NO | 0 | NO | - |
| is_active | boolean | NO | true | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `interview_template_sections_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `interview_template_sections_template_id_interview_templates_id_`: (`template_id`) -> `public.interview_templates` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `interview_template_sections_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.interview_template_semesters`
<a id="table-public-interview-template-semesters"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| template_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `interview_template_semesters_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `interview_template_semesters_template_id_interview_templates_id`: (`template_id`) -> `public.interview_templates` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `interview_template_semesters_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_interview_template_semester` (UNIQUE) using `btree` on `template_id`, `semester`

### Table: `public.interview_templates`
<a id="table-public-interview-templates"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| code | character varying(32) | NO | - | NO | - |
| title | character varying(160) | NO | - | NO | - |
| description | text | YES | - | NO | - |
| allow_multiple | boolean | NO | true | NO | - |
| sort_order | integer | NO | 0 | NO | - |
| is_active | boolean | NO | true | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `interview_templates_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `interview_templates_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_interview_template_code` (UNIQUE) using `btree` on `code`

### Table: `public.login_attempts`
<a id="table-public-login-attempts"></a>

Type: `BASE TABLE`

Comment: Tracks all login attempts (successful and failed) for security monitoring

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| user_id | uuid | YES | - | NO | - |
| username | character varying(255) | NO | - | NO | - |
| ip_address | character varying(64) | NO | - | NO | - |
| user_agent | character varying(512) | YES | - | NO | - |
| success | boolean | NO | false | NO | - |
| failure_reason | character varying(255) | YES | - | NO | - |
| attempted_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `login_attempts_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `login_attempts_user_id_users_id_fk`: (`user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `login_attempts_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_achievements`
<a id="table-public-oc-achievements"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| event | character varying(160) | NO | - | NO | - |
| year | integer | YES | - | NO | - |
| level | character varying(64) | YES | - | NO | - |
| prize | character varying(128) | YES | - | NO | - |

#### Primary Key

- Name: `oc_achievements_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_achievements_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_achievements_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_autobiography`
<a id="table-public-oc-autobiography"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| oc_id | uuid | NO | - | NO | - |
| general_self | text | YES | - | NO | - |
| proficiency_sports | text | YES | - | NO | - |
| achievements_note | text | YES | - | NO | - |
| areas_to_work | text | YES | - | NO | - |
| additional_info | text | YES | - | NO | - |
| filled_on | timestamp with time zone | YES | - | NO | - |
| platoon_commander_name | character varying(160) | YES | - | NO | - |

#### Primary Key

- Name: `oc_autobiography_pkey`
- Columns: `oc_id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_autobiography_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_autobiography_pkey` (UNIQUE, PRIMARY) using `btree` on `oc_id`

### Table: `public.oc_cadets`
<a id="table-public-oc-cadets"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_no | character varying(32) | NO | - | NO | - |
| uid | character varying(64) | NO | - | NO | - |
| name | character varying(160) | NO | - | NO | - |
| course_id | uuid | NO | - | NO | - |
| branch | branch_kind | YES | 'O'::branch_kind | NO | - |
| platoon_id | uuid | YES | - | NO | - |
| arrival_at_university | timestamp with time zone | NO | - | NO | - |
| status | oc_status_kind | NO | 'ACTIVE'::oc_status_kind | NO | - |
| manager_user_id | uuid | YES | - | NO | - |
| relegated_to_course_id | uuid | YES | - | NO | - |
| relegated_on | timestamp with time zone | YES | - | NO | - |
| withdrawn_on | timestamp with time zone | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `oc_cadets_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_cadets_course_id_courses_id_fk`: (`course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `oc_cadets_manager_user_id_users_id_fk`: (`manager_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_cadets_platoon_id_platoons_id_fk`: (`platoon_id`) -> `public.platoons` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_cadets_relegated_to_course_id_courses_id_fk`: (`relegated_to_course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: SET NULL]

#### Indexes

- `oc_cadets_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_camp_activity_scores`
<a id="table-public-oc-camp-activity-scores"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_camp_id | uuid | NO | - | NO | - |
| training_camp_activity_id | uuid | NO | - | NO | - |
| max_marks | integer | NO | - | NO | - |
| marks_scored | integer | NO | - | NO | - |
| remark | text | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `oc_camp_activity_scores_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_camp_activity_scores_oc_camp_id_oc_camps_id_fk`: (`oc_camp_id`) -> `public.oc_camps` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `oc_camp_activity_scores_training_camp_activity_id_training_camp`: (`training_camp_activity_id`) -> `public.training_camp_activities` (`id`) [on update: NO ACTION, on delete: RESTRICT]

#### Indexes

- `oc_camp_activity_scores_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_oc_camp_activity` (UNIQUE) using `btree` on `oc_camp_id`, `training_camp_activity_id`

### Table: `public.oc_camp_reviews`
<a id="table-public-oc-camp-reviews"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_camp_id | uuid | NO | - | NO | - |
| role | camp_review_role_kind | NO | - | NO | - |
| section_title | character varying(200) | NO | - | NO | - |
| review_text | text | NO | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `oc_camp_reviews_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_camp_reviews_oc_camp_id_oc_camps_id_fk`: (`oc_camp_id`) -> `public.oc_camps` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_camp_reviews_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_oc_camp_review_role` (UNIQUE) using `btree` on `oc_camp_id`, `role`

### Table: `public.oc_camps`
<a id="table-public-oc-camps"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| training_camp_id | uuid | NO | - | NO | - |
| year | integer | YES | - | NO | - |
| total_marks_scored | numeric | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_camps_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_camps_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_camps_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `oc_camps_training_camp_id_training_camps_id_fk`: (`training_camp_id`) -> `public.training_camps` (`id`) [on update: NO ACTION, on delete: RESTRICT]

#### Indexes

- `oc_camps_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_oc_camp_per_template` (UNIQUE) using `btree` on `enrollment_id`, `training_camp_id`

### Table: `public.oc_clubs`
<a id="table-public-oc-clubs"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| club_name | character varying(160) | NO | - | NO | - |
| special_achievement | text | YES | - | NO | - |
| remark | text | YES | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_clubs_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_clubs_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_clubs_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_clubs_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_commissioning`
<a id="table-public-oc-commissioning"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| oc_id | uuid | NO | - | NO | - |
| pass_out_date | timestamp with time zone | YES | - | NO | - |
| ic_no | character varying(48) | YES | - | NO | - |
| order_of_merit | integer | YES | - | NO | - |
| regiment_or_arm | character varying(128) | YES | - | NO | - |
| posted_unit | text | YES | - | NO | - |

#### Primary Key

- Name: `oc_commissioning_pkey`
- Columns: `oc_id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_commissioning_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_commissioning_pkey` (UNIQUE, PRIMARY) using `btree` on `oc_id`

### Table: `public.oc_counselling`
<a id="table-public-oc-counselling"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| reason | text | NO | - | NO | - |
| nature_of_warning | counselling_warning_kind | NO | - | NO | - |
| date | date | NO | - | NO | - |
| warned_by | character varying(160) | NO | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_counselling_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_counselling_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_counselling_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_counselling_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_course_enrollments`
<a id="table-public-oc-course-enrollments"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| course_id | uuid | NO | - | NO | - |
| status | oc_enrollment_status | NO | 'ACTIVE'::oc_enrollment_status | NO | - |
| origin | oc_enrollment_origin | NO | 'BASELINE'::oc_enrollment_origin | NO | - |
| started_on | timestamp with time zone | NO | now() | NO | - |
| ended_on | timestamp with time zone | YES | - | NO | - |
| reason | text | YES | - | NO | - |
| note | text | YES | - | NO | - |
| created_by_user_id | uuid | YES | - | NO | - |
| closed_by_user_id | uuid | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `oc_course_enrollments_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_course_enrollments_closed_by_user_id_users_id_fk`: (`closed_by_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_course_enrollments_course_id_courses_id_fk`: (`course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `oc_course_enrollments_created_by_user_id_users_id_fk`: (`created_by_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_course_enrollments_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `idx_oc_course_enrollment_course_status_started` using `btree` on `course_id`, `status`, `started_on`
- `idx_oc_course_enrollment_oc_status_started` using `btree` on `oc_id`, `status`, `started_on`
- `oc_course_enrollments_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_oc_course_enrollment_active` (UNIQUE) using `btree` on `oc_id` where `status = 'ACTIVE'::oc_enrollment_status`

### Table: `public.oc_credit_for_excellence`
<a id="table-public-oc-credit-for-excellence"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| data | jsonb | NO | - | NO | - |
| remark | text | YES | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| sub_category | character varying(160) | YES | - | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_credit_for_excellence_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_credit_for_excellence_enrollment_id_oc_course_enrollments_id`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_credit_for_excellence_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_credit_for_excellence_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_oc_cfe_per_semester` (UNIQUE) using `btree` on `enrollment_id`, `semester`

### Table: `public.oc_delegations`
<a id="table-public-oc-delegations"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| from_course_id | uuid | NO | - | NO | - |
| to_course_id | uuid | NO | - | NO | - |
| reason | text | YES | - | NO | - |
| kind | delegation_kind | NO | 'OTHER'::delegation_kind | NO | - |
| decided_on | timestamp with time zone | NO | now() | NO | - |
| decided_by_user_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_delegations_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_delegations_decided_by_user_id_users_id_fk`: (`decided_by_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_delegations_from_course_id_courses_id_fk`: (`from_course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `oc_delegations_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `oc_delegations_to_course_id_courses_id_fk`: (`to_course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]

#### Indexes

- `oc_delegations_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_discipline`
<a id="table-public-oc-discipline"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| date_of_offence | timestamp with time zone | NO | - | NO | - |
| offence | text | NO | - | NO | - |
| punishment_awarded | character varying(160) | YES | - | NO | - |
| awarded_on | timestamp with time zone | YES | - | NO | - |
| awarded_by | character varying(160) | YES | - | NO | - |
| points_delta | integer | YES | 0 | NO | - |
| points_cumulative | integer | YES | - | NO | - |
| number_of_punishments | integer | YES | - | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_discipline_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_discipline_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_discipline_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_discipline_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_dossier_filling`
<a id="table-public-oc-dossier-filling"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| oc_id | uuid | NO | - | NO | - |
| initiated_by | character varying(160) | YES | - | NO | - |
| opened_on | timestamp with time zone | YES | - | NO | - |
| initial_interview | text | YES | - | NO | - |
| closed_by | character varying(160) | YES | - | NO | - |
| closed_on | timestamp with time zone | YES | - | NO | - |
| final_interview | text | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `oc_dossier_filling_pkey`
- Columns: `oc_id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_dossier_filling_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_dossier_filling_pkey` (UNIQUE, PRIMARY) using `btree` on `oc_id`

### Table: `public.oc_drill`
<a id="table-public-oc-drill"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| max_marks | numeric | NO | - | NO | - |
| m1_marks | numeric | YES | - | NO | - |
| m2_marks | numeric | YES | - | NO | - |
| a1c1_marks | numeric | YES | - | NO | - |
| a2c2_marks | numeric | YES | - | NO | - |
| remark | text | YES | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_drill_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_drill_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_drill_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_drill_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_education`
<a id="table-public-oc-education"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| level | character varying(64) | NO | - | NO | - |
| school_or_college | character varying(160) | NO | - | NO | - |
| board_or_univ | character varying(160) | YES | - | NO | - |
| subjects | text | YES | - | NO | - |
| total_percent | text | YES | - | NO | - |
| per_subject | text | YES | - | NO | - |
| grade | character varying(32) | YES | - | NO | - |

#### Primary Key

- Name: `oc_education_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_education_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_education_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_family_members`
<a id="table-public-oc-family-members"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| name | character varying(160) | NO | - | NO | - |
| relation | character varying(64) | NO | - | NO | - |
| age | integer | YES | - | NO | - |
| occupation | character varying(128) | YES | - | NO | - |
| education | character varying(128) | YES | - | NO | - |
| mobile_no | character varying(32) | YES | - | NO | - |

#### Primary Key

- Name: `oc_family_members_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_family_members_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_family_members_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_images`
<a id="table-public-oc-images"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| kind | oc_image_kind | NO | - | NO | - |
| bucket | character varying(128) | NO | - | NO | - |
| object_key | character varying(512) | NO | - | NO | - |
| content_type | character varying(128) | NO | - | NO | - |
| size_bytes | integer | NO | - | NO | - |
| etag | character varying(128) | YES | - | NO | - |
| uploaded_at | timestamp with time zone | YES | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `oc_images_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_images_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_images_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_oc_images_kind` (UNIQUE) using `btree` on `oc_id`, `kind`

### Table: `public.oc_interview_field_values`
<a id="table-public-oc-interview-field-values"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| interview_id | uuid | NO | - | NO | - |
| field_id | uuid | NO | - | NO | - |
| value_text | text | YES | - | NO | - |
| value_date | date | YES | - | NO | - |
| value_number | integer | YES | - | NO | - |
| value_bool | boolean | YES | - | NO | - |
| value_json | jsonb | YES | - | NO | - |
| filed_at | date | YES | - | NO | - |
| filed_by_name | character varying(160) | YES | - | NO | - |
| filed_by_rank | character varying(64) | YES | - | NO | - |
| filed_by_appointment | character varying(128) | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `oc_interview_field_values_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_interview_field_values_field_id_interview_template_fields_id`: (`field_id`) -> `public.interview_template_fields` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `oc_interview_field_values_interview_id_oc_interviews_id_fk`: (`interview_id`) -> `public.oc_interviews` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_interview_field_values_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_oc_interview_field` (UNIQUE) using `btree` on `interview_id`, `field_id`

### Table: `public.oc_interview_group_rows`
<a id="table-public-oc-interview-group-rows"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| interview_id | uuid | NO | - | NO | - |
| group_id | uuid | NO | - | NO | - |
| row_index | integer | NO | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `oc_interview_group_rows_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_interview_group_rows_group_id_interview_template_groups_id_f`: (`group_id`) -> `public.interview_template_groups` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `oc_interview_group_rows_interview_id_oc_interviews_id_fk`: (`interview_id`) -> `public.oc_interviews` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_interview_group_rows_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_oc_interview_group_row` (UNIQUE) using `btree` on `interview_id`, `group_id`, `row_index`

### Table: `public.oc_interview_group_values`
<a id="table-public-oc-interview-group-values"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| row_id | uuid | NO | - | NO | - |
| field_id | uuid | NO | - | NO | - |
| value_text | text | YES | - | NO | - |
| value_date | date | YES | - | NO | - |
| value_number | integer | YES | - | NO | - |
| value_bool | boolean | YES | - | NO | - |
| value_json | jsonb | YES | - | NO | - |
| filed_at | date | YES | - | NO | - |
| filed_by_name | character varying(160) | YES | - | NO | - |
| filed_by_rank | character varying(64) | YES | - | NO | - |
| filed_by_appointment | character varying(128) | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `oc_interview_group_values_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_interview_group_values_field_id_interview_template_fields_id`: (`field_id`) -> `public.interview_template_fields` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `oc_interview_group_values_row_id_oc_interview_group_rows_id_fk`: (`row_id`) -> `public.oc_interview_group_rows` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_interview_group_values_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_oc_interview_group_value` (UNIQUE) using `btree` on `row_id`, `field_id`

### Table: `public.oc_interviews`
<a id="table-public-oc-interviews"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| template_id | uuid | NO | - | NO | - |
| semester | integer | YES | - | NO | - |
| course | character varying(160) | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_interviews_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_interviews_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_interviews_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `oc_interviews_template_id_interview_templates_id_fk`: (`template_id`) -> `public.interview_templates` (`id`) [on update: NO ACTION, on delete: RESTRICT]

#### Indexes

- `oc_interviews_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_medical_category`
<a id="table-public-oc-medical-category"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| date | timestamp with time zone | NO | - | NO | - |
| mos_and_diagnostics | text | YES | - | NO | - |
| cat_from | timestamp with time zone | YES | - | NO | - |
| cat_to | timestamp with time zone | YES | - | NO | - |
| mh_from | timestamp with time zone | YES | - | NO | - |
| mh_to | timestamp with time zone | YES | - | NO | - |
| absence | text | YES | - | NO | - |
| platoon_commander_name | character varying(160) | YES | - | NO | - |

#### Primary Key

- Name: `oc_medical_category_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_medical_category_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_medical_category_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_medicals`
<a id="table-public-oc-medicals"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| date | timestamp with time zone | NO | - | NO | - |
| age | numeric | YES | - | NO | - |
| height_cm | numeric | YES | - | NO | - |
| ibw_kg | numeric | YES | - | NO | - |
| abw_kg | numeric | YES | - | NO | - |
| overwt_pct | numeric | YES | - | NO | - |
| bmi | numeric | YES | - | NO | - |
| chest_cm | numeric | YES | - | NO | - |
| medical_history | text | YES | - | NO | - |
| hereditary_issues | text | YES | - | NO | - |
| allergies | text | YES | - | NO | - |

#### Primary Key

- Name: `oc_medicals_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_medicals_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_medicals_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_motivation_awards`
<a id="table-public-oc-motivation-awards"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| field_name | character varying(160) | NO | - | NO | - |
| max_marks | numeric | NO | - | NO | - |
| marks_obtained | numeric | NO | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| motivation_title | character varying(200) | NO | - | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_motivation_awards_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_motivation_awards_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_motivation_awards_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_motivation_awards_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_obstacle_training`
<a id="table-public-oc-obstacle-training"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| obstacle | character varying(160) | NO | - | NO | - |
| marks_obtained | numeric | NO | - | NO | - |
| remark | text | YES | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_obstacle_training_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_obstacle_training_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_obstacle_training_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_obstacle_training_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_olq`
<a id="table-public-oc-olq"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| total_marks | integer | YES | - | NO | - |
| remarks | text | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_olq_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_olq_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_olq_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `idx_oc_olq_enrollment_sem` using `btree` on `enrollment_id`, `semester`
- `oc_olq_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_oc_olq_semester` (UNIQUE) using `btree` on `enrollment_id`, `semester`

### Table: `public.oc_olq_category`
<a id="table-public-oc-olq-category"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| code | character varying(50) | NO | - | NO | - |
| title | character varying(255) | NO | - | NO | - |
| description | text | YES | - | NO | - |
| display_order | integer | NO | 0 | NO | - |
| is_active | boolean | NO | true | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| course_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_olq_category_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_olq_category_course_id_courses_id_fk`: (`course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]

#### Indexes

- `idx_olq_category_course_active_order` using `btree` on `course_id`, `is_active`, `display_order`
- `oc_olq_category_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_olq_category_course_code_active` (UNIQUE) using `btree` on `course_id`, `code` where `is_active = true`

### Table: `public.oc_olq_score`
<a id="table-public-oc-olq-score"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_olq_id | uuid | NO | - | NO | - |
| subtitle_id | uuid | NO | - | NO | - |
| marks_scored | integer | NO | 0 | NO | - |

#### Primary Key

- Name: `oc_olq_score_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_olq_score_oc_olq_id_oc_olq_id_fk`: (`oc_olq_id`) -> `public.oc_olq` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `oc_olq_score_subtitle_id_oc_olq_subtitle_id_fk`: (`subtitle_id`) -> `public.oc_olq_subtitle` (`id`) [on update: NO ACTION, on delete: RESTRICT]

#### Indexes

- `oc_olq_score_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_olq_score_per_subtitle` (UNIQUE) using `btree` on `oc_olq_id`, `subtitle_id`

### Table: `public.oc_olq_subtitle`
<a id="table-public-oc-olq-subtitle"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| category_id | uuid | NO | - | NO | - |
| subtitle | character varying(255) | NO | - | NO | - |
| max_marks | integer | NO | 20 | NO | - |
| display_order | integer | NO | 0 | NO | - |
| is_active | boolean | NO | true | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `oc_olq_subtitle_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_olq_subtitle_category_id_oc_olq_category_id_fk`: (`category_id`) -> `public.oc_olq_category` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_olq_subtitle_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_olq_subtitle_per_category` (UNIQUE) using `btree` on `category_id`, `subtitle`

### Table: `public.oc_parent_comms`
<a id="table-public-oc-parent-comms"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| mode | comm_mode_kind | NO | - | NO | - |
| ref_no | character varying(64) | YES | - | NO | - |
| date | timestamp with time zone | NO | - | NO | - |
| brief | text | NO | - | NO | - |
| platoon_commander_name | character varying(160) | YES | - | NO | - |
| subject | text | YES | - | NO | - |

#### Primary Key

- Name: `oc_parent_comms_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_parent_comms_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_parent_comms_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_personal`
<a id="table-public-oc-personal"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| oc_id | uuid | NO | - | NO | - |
| visible_ident_marks | text | YES | - | NO | - |
| pi | character varying(64) | YES | - | NO | - |
| dob | timestamp with time zone | YES | - | NO | - |
| place_of_birth | character varying(128) | YES | - | NO | - |
| domicile | character varying(128) | YES | - | NO | - |
| religion | character varying(64) | YES | - | NO | - |
| nationality | character varying(64) | YES | - | NO | - |
| blood_group | character varying(8) | YES | - | NO | - |
| ident_marks | text | YES | - | NO | - |
| mobile_no | character varying(32) | YES | - | NO | - |
| email | character varying(255) | YES | - | NO | - |
| passport_no | character varying(64) | YES | - | NO | - |
| pan_no | character varying(20) | YES | - | NO | - |
| aadhaar_no | character varying(16) | YES | - | NO | - |
| father_name | character varying(160) | YES | - | NO | - |
| father_mobile | character varying(32) | YES | - | NO | - |
| father_addr_permanent | text | YES | - | NO | - |
| father_addr_present | text | YES | - | NO | - |
| father_profession | character varying(128) | YES | - | NO | - |
| guardian_name | character varying(160) | YES | - | NO | - |
| guardian_address | text | YES | - | NO | - |
| monthly_income | integer | YES | - | NO | - |
| nok_details | text | YES | - | NO | - |
| nok_addr_perm | text | YES | - | NO | - |
| nok_addr_present | text | YES | - | NO | - |
| nearest_railway_station | character varying(128) | YES | - | NO | - |
| family_in_secunderabad | text | YES | - | NO | - |
| relative_in_armed_forces | text | YES | - | NO | - |
| govt_financial_assistance | boolean | YES | false | NO | - |
| bank_details | text | YES | - | NO | - |
| iden_card_no | character varying(64) | YES | - | NO | - |
| upsc_roll_no | character varying(32) | YES | - | NO | - |
| ssb_centre | character varying(64) | YES | - | NO | - |
| games | text | YES | - | NO | - |
| hobbies | text | YES | - | NO | - |
| is_swimmer | boolean | YES | - | NO | - |
| languages | text | YES | - | NO | - |
| ds_pi_ss_ic_no | character varying(64) | YES | - | NO | - |
| ds_pi_rank | character varying(64) | YES | - | NO | - |
| ds_pi_name | character varying(160) | YES | - | NO | - |
| ds_pi_unit_arm | character varying(160) | YES | - | NO | - |
| ds_pi_mobile | character varying(32) | YES | - | NO | - |
| ds_dy_ic_no | character varying(64) | YES | - | NO | - |
| ds_dy_rank | character varying(64) | YES | - | NO | - |
| ds_dy_name | character varying(160) | YES | - | NO | - |
| ds_dy_unit_arm | character varying(160) | YES | - | NO | - |
| ds_dy_mobile | character varying(32) | YES | - | NO | - |
| ds_cdr_ic_no | character varying(64) | YES | - | NO | - |
| ds_cdr_rank | character varying(64) | YES | - | NO | - |
| ds_cdr_name | character varying(160) | YES | - | NO | - |
| ds_cdr_unit_arm | character varying(160) | YES | - | NO | - |
| ds_cdr_mobile | character varying(32) | YES | - | NO | - |

#### Primary Key

- Name: `oc_personal_pkey`
- Columns: `oc_id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_personal_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_personal_pkey` (UNIQUE, PRIMARY) using `btree` on `oc_id`

### Table: `public.oc_pre_commission`
<a id="table-public-oc-pre-commission"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| oc_id | uuid | NO | - | NO | - |
| course_id | uuid | NO | - | NO | - |
| branch | branch_kind | YES | 'O'::branch_kind | NO | - |
| platoon_id | uuid | YES | - | NO | - |
| relegated_to_course_id | uuid | YES | - | NO | - |
| relegated_on | timestamp with time zone | YES | - | NO | - |
| withdrawn_on | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `oc_pre_commission_pkey`
- Columns: `oc_id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_pre_commission_course_id_courses_id_fk`: (`course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `oc_pre_commission_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `oc_pre_commission_platoon_id_platoons_id_fk`: (`platoon_id`) -> `public.platoons` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_pre_commission_relegated_to_course_id_courses_id_fk`: (`relegated_to_course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: SET NULL]

#### Indexes

- `oc_pre_commission_pkey` (UNIQUE, PRIMARY) using `btree` on `oc_id`

### Table: `public.oc_pt_motivation_awards`
<a id="table-public-oc-pt-motivation-awards"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| pt_motivation_field_id | uuid | NO | - | NO | - |
| value | text | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_pt_motivation_awards_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_pt_motivation_awards_enrollment_id_oc_course_enrollments_id_`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_pt_motivation_awards_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `oc_pt_motivation_awards_pt_motivation_field_id_pt_motivation_aw`: (`pt_motivation_field_id`) -> `public.pt_motivation_award_fields` (`id`) [on update: NO ACTION, on delete: RESTRICT]

#### Indexes

- `oc_pt_motivation_awards_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_oc_pt_motivation_field` (UNIQUE) using `btree` on `enrollment_id`, `pt_motivation_field_id`

### Table: `public.oc_pt_task_scores`
<a id="table-public-oc-pt-task-scores"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| pt_task_score_id | uuid | NO | - | NO | - |
| marks_scored | integer | NO | - | NO | - |
| remark | text | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_pt_task_scores_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_pt_task_scores_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_pt_task_scores_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `oc_pt_task_scores_pt_task_score_id_pt_task_scores_id_fk`: (`pt_task_score_id`) -> `public.pt_task_scores` (`id`) [on update: NO ACTION, on delete: RESTRICT]

#### Indexes

- `oc_pt_task_scores_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_oc_pt_task_score` (UNIQUE) using `btree` on `enrollment_id`, `pt_task_score_id`

### Table: `public.oc_recording_leave_hike_detention`
<a id="table-public-oc-recording-leave-hike-detention"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| reason | text | NO | - | NO | - |
| type | leave_record_kind | NO | - | NO | - |
| date_from | date | NO | - | NO | - |
| date_to | date | NO | - | NO | - |
| remark | text | YES | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_recording_leave_hike_detention_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_recording_leave_hike_detention_enrollment_id_oc_course_enrol`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_recording_leave_hike_detention_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_recording_leave_hike_detention_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_relegations`
<a id="table-public-oc-relegations"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| from_course_id | uuid | NO | - | NO | - |
| from_course_code | character varying(32) | NO | - | NO | - |
| to_course_id | uuid | NO | - | NO | - |
| to_course_code | character varying(32) | NO | - | NO | - |
| reason | text | NO | - | NO | - |
| remark | text | YES | - | NO | - |
| pdf_object_key | character varying(512) | YES | - | NO | - |
| pdf_url | text | YES | - | NO | - |
| performed_by_user_id | uuid | NO | - | NO | - |
| performed_at | timestamp with time zone | NO | now() | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| movement_kind | oc_movement_kind | NO | 'TRANSFER'::oc_movement_kind | NO | - |
| from_enrollment_id | uuid | YES | - | NO | - |
| to_enrollment_id | uuid | YES | - | NO | - |
| reversal_of_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_relegations_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_relegations_from_course_id_courses_id_fk`: (`from_course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `oc_relegations_from_enrollment_id_oc_course_enrollments_id_fk`: (`from_enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_relegations_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `oc_relegations_performed_by_user_id_users_id_fk`: (`performed_by_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `oc_relegations_to_course_id_courses_id_fk`: (`to_course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `oc_relegations_to_enrollment_id_oc_course_enrollments_id_fk`: (`to_enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]

#### Indexes

- `idx_oc_relegations_from_course` using `btree` on `from_course_id`
- `idx_oc_relegations_from_enrollment` using `btree` on `from_enrollment_id`
- `idx_oc_relegations_movement_kind_performed_at` using `btree` on `movement_kind`, `performed_at`
- `idx_oc_relegations_oc_performed_at` using `btree` on `oc_id`, `performed_at`
- `idx_oc_relegations_to_course` using `btree` on `to_course_id`
- `idx_oc_relegations_to_enrollment` using `btree` on `to_enrollment_id`
- `oc_relegations_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_semester_marks`
<a id="table-public-oc-semester-marks"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| branch_tag | character varying(1) | NO | - | NO | - |
| sgpa | numeric | YES | - | NO | - |
| cgpa | numeric | YES | - | NO | - |
| marks_scored | numeric | YES | - | NO | - |
| subjects | jsonb | NO | '[]'::jsonb | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_semester_marks_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_semester_marks_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_semester_marks_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `idx_oc_semester_marks_enrollment_sem` using `btree` on `enrollment_id`, `semester`
- `oc_semester_marks_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_oc_semester_marks` (UNIQUE) using `btree` on `enrollment_id`, `semester`

### Table: `public.oc_special_achievement_in_clubs`
<a id="table-public-oc-special-achievement-in-clubs"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| achievement | text | NO | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_special_achievement_in_clubs_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_special_achievement_in_clubs_enrollment_id_oc_course_enrollm`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_special_achievement_in_clubs_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_special_achievement_in_clubs_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_special_achievement_in_firing`
<a id="table-public-oc-special-achievement-in-firing"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| achievement | text | NO | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `oc_special_achievement_in_firing_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_special_achievement_in_firing_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_special_achievement_in_firing_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_speed_march`
<a id="table-public-oc-speed-march"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| test | character varying(160) | NO | - | NO | - |
| timings | character varying(64) | NO | - | NO | - |
| marks | numeric | NO | - | NO | - |
| remark | text | YES | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_speed_march_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_speed_march_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_speed_march_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_speed_march_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_sports_and_games`
<a id="table-public-oc-sports-and-games"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| term | term_kind | NO | - | NO | - |
| sport | character varying(160) | NO | - | NO | - |
| max_marks | numeric | NO | - | NO | - |
| marks_obtained | numeric | NO | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| sports_strings | text | YES | - | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_sports_and_games_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_sports_and_games_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_sports_and_games_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_sports_and_games_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_spr_records`
<a id="table-public-oc-spr-records"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| cdr_marks | numeric | NO | 0 | NO | - |
| subject_remarks | jsonb | NO | '{}'::jsonb | NO | - |
| platoon_commander_remarks | text | YES | - | NO | - |
| deputy_commander_remarks | text | YES | - | NO | - |
| commander_remarks | text | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_spr_records_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_spr_records_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_spr_records_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_spr_records_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_oc_spr_record` (UNIQUE) using `btree` on `enrollment_id`, `semester`

### Table: `public.oc_ssb_points`
<a id="table-public-oc-ssb-points"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| report_id | uuid | NO | - | NO | - |
| kind | ssb_point_kind | NO | - | NO | - |
| remark | text | NO | - | NO | - |
| author_user_id | uuid | YES | - | NO | - |
| author_name | character varying(160) | YES | - | NO | - |

#### Primary Key

- Name: `oc_ssb_points_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_ssb_points_author_user_id_users_id_fk`: (`author_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_ssb_points_report_id_oc_ssb_reports_id_fk`: (`report_id`) -> `public.oc_ssb_reports` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_ssb_points_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_ssb_reports`
<a id="table-public-oc-ssb-reports"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| overall_predictive_rating | integer | YES | - | NO | - |
| scope_of_improvement | text | YES | - | NO | - |

#### Primary Key

- Name: `oc_ssb_reports_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_ssb_reports_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_ssb_reports_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.oc_weapon_training`
<a id="table-public-oc-weapon-training"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| oc_id | uuid | NO | - | NO | - |
| subject | character varying(200) | NO | - | NO | - |
| semester | integer | NO | - | NO | - |
| max_marks | numeric | NO | - | NO | - |
| marks_obtained | numeric | NO | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| enrollment_id | uuid | YES | - | NO | - |

#### Primary Key

- Name: `oc_weapon_training_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `oc_weapon_training_enrollment_id_oc_course_enrollments_id_fk`: (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `oc_weapon_training_oc_id_oc_cadets_id_fk`: (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `oc_weapon_training_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.permission_field_rules`
<a id="table-public-permission-field-rules"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| permission_id | uuid | NO | - | NO | - |
| position_id | uuid | YES | - | NO | - |
| role_id | uuid | YES | - | NO | - |
| mode | field_rule_mode | NO | 'ALLOW'::field_rule_mode | NO | - |
| fields | text[] | NO | '{}'::text[] | NO | - |
| note | text | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `permission_field_rules_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

- `chk_permission_field_rules_scope`: `CHECK (position_id IS NOT NULL OR role_id IS NOT NULL)`

#### Foreign Keys

- `permission_field_rules_permission_id_permissions_id_fk`: (`permission_id`) -> `public.permissions` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `permission_field_rules_position_id_positions_id_fk`: (`position_id`) -> `public.positions` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `permission_field_rules_role_id_roles_id_fk`: (`role_id`) -> `public.roles` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `permission_field_rules_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `ux_permission_field_rules_scope` (UNIQUE) using `btree` on `permission_id`, `position_id`, `role_id`, `mode`

### Table: `public.permissions`
<a id="table-public-permissions"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| key | character varying(128) | NO | - | NO | - |
| description | text | YES | - | NO | - |

#### Primary Key

- Name: `permissions_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `permissions_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.platoons`
<a id="table-public-platoons"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| key | character varying(64) | NO | - | NO | - |
| name | character varying(128) | NO | - | NO | - |
| about | text | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| theme_color | character varying(7) | NO | '#1D4ED8'::character varying | NO | - |
| image_url | text | YES | - | NO | - |
| image_object_key | text | YES | - | NO | - |

#### Primary Key

- Name: `platoons_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `platoons_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_platoons_key` (UNIQUE) using `btree` on `key`

### Table: `public.position_permissions`
<a id="table-public-position-permissions"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| position_id | uuid | NO | - | NO | - |
| permission_id | uuid | NO | - | NO | - |

#### Primary Key

- Name: `position_permissions_position_id_permission_id_pk`
- Columns: `position_id`, `permission_id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `position_permissions_permission_id_permissions_id_fk`: (`permission_id`) -> `public.permissions` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `position_permissions_position_id_positions_id_fk`: (`position_id`) -> `public.positions` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `position_permissions_position_id_permission_id_pk` (UNIQUE, PRIMARY) using `btree` on `position_id`, `permission_id`

### Table: `public.positions`
<a id="table-public-positions"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| key | character varying(64) | NO | - | NO | - |
| display_name | character varying(128) | YES | - | NO | - |
| default_scope | character varying(16) | NO | - | NO | - |
| singleton | boolean | NO | true | NO | - |
| description | text | YES | - | NO | - |
| created_at | timestamp with time zone | YES | now() | NO | - |

#### Primary Key

- Name: `positions_pkey`
- Columns: `id`

#### Unique Constraints

- `positions_key_unique` (`key`)

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `positions_key_unique` (UNIQUE) using `btree` on `key`
- `positions_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.pt_attempt_grades`
<a id="table-public-pt-attempt-grades"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| pt_attempt_id | uuid | NO | - | NO | - |
| code | character varying(8) | NO | - | NO | - |
| label | character varying(64) | NO | - | NO | - |
| sort_order | integer | NO | 0 | NO | - |
| is_active | boolean | NO | true | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `pt_attempt_grades_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `pt_attempt_grades_pt_attempt_id_pt_type_attempts_id_fk`: (`pt_attempt_id`) -> `public.pt_type_attempts` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `pt_attempt_grades_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_pt_grade_per_attempt` (UNIQUE) using `btree` on `pt_attempt_id`, `code`

### Table: `public.pt_motivation_award_fields`
<a id="table-public-pt-motivation-award-fields"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| semester | integer | NO | - | NO | - |
| label | character varying(160) | NO | - | NO | - |
| sort_order | integer | NO | 0 | NO | - |
| is_active | boolean | NO | true | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `pt_motivation_award_fields_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `pt_motivation_award_fields_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_pt_motivation_field_semester` (UNIQUE) using `btree` on `semester`, `label`

### Table: `public.pt_task_scores`
<a id="table-public-pt-task-scores"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| pt_task_id | uuid | NO | - | NO | - |
| pt_attempt_id | uuid | NO | - | NO | - |
| pt_attempt_grade_id | uuid | NO | - | NO | - |
| max_marks | integer | NO | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `pt_task_scores_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `pt_task_scores_pt_attempt_grade_id_pt_attempt_grades_id_fk`: (`pt_attempt_grade_id`) -> `public.pt_attempt_grades` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `pt_task_scores_pt_attempt_id_pt_type_attempts_id_fk`: (`pt_attempt_id`) -> `public.pt_type_attempts` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `pt_task_scores_pt_task_id_pt_tasks_id_fk`: (`pt_task_id`) -> `public.pt_tasks` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `pt_task_scores_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_pt_task_attempt_grade` (UNIQUE) using `btree` on `pt_task_id`, `pt_attempt_id`, `pt_attempt_grade_id`

### Table: `public.pt_tasks`
<a id="table-public-pt-tasks"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| pt_type_id | uuid | NO | - | NO | - |
| title | character varying(160) | NO | - | NO | - |
| max_marks | integer | NO | - | NO | - |
| sort_order | integer | NO | 0 | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `pt_tasks_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `pt_tasks_pt_type_id_pt_types_id_fk`: (`pt_type_id`) -> `public.pt_types` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `pt_tasks_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.pt_type_attempts`
<a id="table-public-pt-type-attempts"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| pt_type_id | uuid | NO | - | NO | - |
| code | character varying(16) | NO | - | NO | - |
| label | character varying(64) | NO | - | NO | - |
| is_compensatory | boolean | NO | false | NO | - |
| sort_order | integer | NO | 0 | NO | - |
| is_active | boolean | NO | true | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `pt_type_attempts_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `pt_type_attempts_pt_type_id_pt_types_id_fk`: (`pt_type_id`) -> `public.pt_types` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `pt_type_attempts_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_pt_attempt_per_type` (UNIQUE) using `btree` on `pt_type_id`, `code`

### Table: `public.pt_types`
<a id="table-public-pt-types"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| semester | integer | NO | - | NO | - |
| code | character varying(32) | NO | - | NO | - |
| title | character varying(160) | NO | - | NO | - |
| description | text | YES | - | NO | - |
| max_total_marks | integer | NO | - | NO | - |
| sort_order | integer | NO | 0 | NO | - |
| is_active | boolean | NO | true | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `pt_types_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `pt_types_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_pt_type_semester_code` (UNIQUE) using `btree` on `semester`, `code`

### Table: `public.punishments`
<a id="table-public-punishments"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| title | character varying(160) | NO | - | NO | - |
| marks_deduction | integer | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `punishments_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `punishments_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.role_permissions`
<a id="table-public-role-permissions"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| role_id | uuid | NO | - | NO | - |
| permission_id | uuid | NO | - | NO | - |

#### Primary Key

- Name: `role_permissions_role_id_permission_id_pk`
- Columns: `role_id`, `permission_id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `role_permissions_permission_id_permissions_id_fk`: (`permission_id`) -> `public.permissions` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `role_permissions_role_id_roles_id_fk`: (`role_id`) -> `public.roles` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `role_permissions_role_id_permission_id_pk` (UNIQUE, PRIMARY) using `btree` on `role_id`, `permission_id`

### Table: `public.roles`
<a id="table-public-roles"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| key | character varying(64) | NO | - | NO | - |
| description | text | YES | - | NO | - |

#### Primary Key

- Name: `roles_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `roles_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.signup_requests`
<a id="table-public-signup-requests"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| user_id | uuid | NO | - | NO | - |
| note | text | YES | - | NO | - |
| status | character varying(16) | NO | 'pending'::character varying | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| resolved_at | timestamp with time zone | YES | - | NO | - |
| resolved_by | uuid | YES | - | NO | - |
| admin_reason | text | YES | - | NO | - |
| payload | jsonb | YES | - | NO | - |

#### Primary Key

- Name: `signup_requests_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `signup_requests_resolved_by_users_id_fk`: (`resolved_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `signup_requests_user_id_users_id_fk`: (`user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `ix_signup_requests_created_at` using `btree` on `created_at`
- `ix_signup_requests_status` using `btree` on `status`
- `signup_requests_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.site_awards`
<a id="table-public-site-awards"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| title | text | NO | - | NO | - |
| description | text | NO | - | NO | - |
| image_url | text | YES | - | NO | - |
| image_object_key | text | YES | - | NO | - |
| category | text | NO | - | NO | - |
| sort_order | integer | NO | 0 | NO | - |
| is_deleted | boolean | NO | false | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `site_awards_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `ix_site_awards_active_sort` using `btree` on `is_deleted`, `sort_order`
- `site_awards_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.site_commanders`
<a id="table-public-site-commanders"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| name | text | NO | - | NO | - |
| image_url | text | YES | - | NO | - |
| image_object_key | text | YES | - | NO | - |
| tenure | text | NO | - | NO | - |
| description | text | NO | - | NO | - |
| sort_order | integer | NO | 0 | NO | - |
| is_deleted | boolean | NO | false | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| designation | text | NO | ''::text | NO | - |

#### Primary Key

- Name: `site_commanders_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `ix_site_commanders_active_sort` using `btree` on `is_deleted`, `sort_order`
- `site_commanders_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.site_history`
<a id="table-public-site-history"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| incident_date | date | NO | - | NO | - |
| description | text | NO | - | NO | - |
| is_deleted | boolean | NO | false | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |

#### Primary Key

- Name: `site_history_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `ix_site_history_active_created_at` using `btree` on `is_deleted`, `created_at`
- `site_history_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.site_settings`
<a id="table-public-site-settings"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| singleton_key | text | NO | 'default'::text | NO | - |
| logo_url | text | YES | - | NO | - |
| logo_object_key | text | YES | - | NO | - |
| hero_title | text | NO | 'MCEME'::text | NO | - |
| hero_description | text | NO | 'Training Excellence for Officer Cadets (OCs) at the Military College of Electronics & Mechanical Engineering'::text | NO | - |
| commanders_section_title | text | NO | 'Commander''s Corner'::text | NO | - |
| awards_section_title | text | NO | 'Gallantry Awards'::text | NO | - |
| history_section_title | text | NO | 'Our History'::text | NO | - |
| updated_by | uuid | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| hero_bg_url | text | YES | - | NO | - |
| hero_bg_object_key | text | YES | - | NO | - |

#### Primary Key

- Name: `site_settings_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `site_settings_updated_by_users_id_fk`: (`updated_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]

#### Indexes

- `site_settings_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_site_settings_singleton_key` (UNIQUE) using `btree` on `singleton_key`

### Table: `public.subjects`
<a id="table-public-subjects"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| code | character varying(32) | NO | - | NO | - |
| name | character varying(160) | NO | - | NO | - |
| branch | character varying(1) | NO | - | NO | - |
| has_theory | boolean | NO | true | NO | - |
| has_practical | boolean | NO | false | NO | - |
| default_theory_credits | integer | YES | - | NO | - |
| default_practical_credits | integer | YES | - | NO | - |
| description | text | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| no_of_periods | integer | NO | 0 | NO | - |

#### Primary Key

- Name: `subjects_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `subjects_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_subjects_code` (UNIQUE) using `btree` on `code`

### Table: `public.training_camp_activities`
<a id="table-public-training-camp-activities"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| training_camp_id | uuid | NO | - | NO | - |
| name | character varying(160) | NO | - | NO | - |
| default_max_marks | integer | NO | - | NO | - |
| sort_order | integer | NO | 0 | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `training_camp_activities_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `training_camp_activities_training_camp_id_training_camps_id_fk`: (`training_camp_id`) -> `public.training_camps` (`id`) [on update: NO ACTION, on delete: CASCADE]

#### Indexes

- `training_camp_activities_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Table: `public.training_camps`
<a id="table-public-training-camps"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| name | character varying(120) | NO | - | NO | - |
| semester | camp_semester_kind | NO | - | NO | - |
| max_total_marks | integer | NO | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | NO | now() | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `training_camps_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

_None_

#### Indexes

- `training_camps_pkey` (UNIQUE, PRIMARY) using `btree` on `id`
- `uq_training_camp_name_semester` (UNIQUE) using `btree` on `name`, `semester`

### Table: `public.users`
<a id="table-public-users"></a>

Type: `BASE TABLE`

Comment: _None_

#### Columns

| Column | Type | Nullable | Default | Identity | Comment |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | NO | - |
| username | character varying(64) | NO | - | NO | - |
| email | character varying(255) | NO | - | NO | - |
| phone | character varying(32) | NO | - | NO | - |
| name | character varying(120) | NO | - | NO | - |
| rank | character varying(64) | NO | - | NO | - |
| appoint_id | uuid | YES | - | NO | - |
| is_active | boolean | NO | true | NO | - |
| deactivated_at | timestamp with time zone | YES | - | NO | - |
| deleted_at | timestamp with time zone | YES | - | NO | - |
| created_at | timestamp with time zone | NO | now() | NO | - |
| updated_at | timestamp with time zone | YES | - | NO | - |

#### Primary Key

- Name: `users_pkey`
- Columns: `id`

#### Unique Constraints

_None_

#### Check Constraints

_None_

#### Foreign Keys

- `users_appoint_id_positions_id_fk`: (`appoint_id`) -> `public.positions` (`id`) [on update: NO ACTION, on delete: SET NULL]

#### Indexes

- `users_pkey` (UNIQUE, PRIMARY) using `btree` on `id`

### Enums

- `public.assignment_kind`: `OFFICIATING`, `PRIMARY`
- `public.branch_kind`: `E`, `M`, `O`
- `public.camp_review_role_kind`: `HOAT`, `OIC`, `PLATOON_COMMANDER`
- `public.camp_semester_kind`: `SEM5`, `SEM6A`, `SEM6B`
- `public.comm_mode_kind`: `EMAIL`, `IN_PERSON`, `LETTER`, `OTHER`, `PHONE`
- `public.counselling_warning_kind`: `OTHER`, `RELEGATION`, `WITHDRAWAL`
- `public.delegation_kind`: `ACADEMIC`, `ADMIN`, `DISCIPLINARY`, `MEDICAL`, `OTHER`
- `public.field_rule_mode`: `ALLOW`, `DENY`, `MASK`, `OMIT`
- `public.leave_record_kind`: `DETENTION`, `HIKE`, `LEAVE`
- `public.oc_enrollment_origin`: `BASELINE`, `MANUAL`, `PROMOTION`, `TRANSFER`
- `public.oc_enrollment_status`: `ACTIVE`, `ARCHIVED`, `VOIDED`
- `public.oc_image_kind`: `CIVIL_DRESS`, `UNIFORM`
- `public.oc_movement_kind`: `PROMOTION_BATCH`, `PROMOTION_EXCEPTION`, `TRANSFER`, `VOID_PROMOTION`
- `public.oc_status_kind`: `ACTIVE`, `DELEGATED`, `INACTIVE`, `PASSED_OUT`, `WITHDRAWN`
- `public.position_type`: `ADMIN`, `CCO`, `COMMANDANT`, `DEPUTY_COMMANDANT`, `DEPUTY_SECRETARY`, `HOAT`, `PLATOON_COMMANDER`, `SUPER_ADMIN`
- `public.scope_type`: `GLOBAL`, `PLATOON`
- `public.ssb_point_kind`: `NEGATIVE`, `POSITIVE`
- `public.term_kind`: `autumn`, `spring`

## Relationships Summary

- `public.account_lockouts` (`unlocked_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.account_lockouts` (`user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.appointment_transfers` (`from_appointment_id`) -> `public.appointments` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.appointment_transfers` (`from_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.appointment_transfers` (`position_id`) -> `public.positions` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.appointment_transfers` (`to_appointment_id`) -> `public.appointments` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.appointment_transfers` (`to_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.appointment_transfers` (`transferred_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.appointments` (`appointed_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.appointments` (`ended_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.appointments` (`position_id`) -> `public.positions` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.appointments` (`user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.audit_logs` (`actor_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.course_offering_instructors` (`instructor_id`) -> `public.instructors` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.course_offering_instructors` (`offering_id`) -> `public.course_offerings` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.course_offerings` (`course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.course_offerings` (`subject_id`) -> `public.subjects` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.credentials_local` (`user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.delegations` (`act_as_position_id`) -> `public.positions` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.delegations` (`grantee_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.delegations` (`grantor_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.delegations` (`scope_id`) -> `public.platoons` (`id`) [on update: NO ACTION, on delete: NO ACTION]
- `public.delegations` (`terminated_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.device_site_settings` (`updated_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.dossier_inspections` (`inspector_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.dossier_inspections` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.instructors` (`user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.interview_template_field_options` (`field_id`) -> `public.interview_template_fields` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.interview_template_fields` (`group_id`) -> `public.interview_template_groups` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.interview_template_fields` (`section_id`) -> `public.interview_template_sections` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.interview_template_fields` (`template_id`) -> `public.interview_templates` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.interview_template_groups` (`section_id`) -> `public.interview_template_sections` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.interview_template_groups` (`template_id`) -> `public.interview_templates` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.interview_template_sections` (`template_id`) -> `public.interview_templates` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.interview_template_semesters` (`template_id`) -> `public.interview_templates` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.login_attempts` (`user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_achievements` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_autobiography` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_cadets` (`course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_cadets` (`manager_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_cadets` (`platoon_id`) -> `public.platoons` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_cadets` (`relegated_to_course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_camp_activity_scores` (`oc_camp_id`) -> `public.oc_camps` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_camp_activity_scores` (`training_camp_activity_id`) -> `public.training_camp_activities` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_camp_reviews` (`oc_camp_id`) -> `public.oc_camps` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_camps` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_camps` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_camps` (`training_camp_id`) -> `public.training_camps` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_clubs` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_clubs` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_commissioning` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_counselling` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_counselling` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_course_enrollments` (`closed_by_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_course_enrollments` (`course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_course_enrollments` (`created_by_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_course_enrollments` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_credit_for_excellence` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_credit_for_excellence` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_delegations` (`decided_by_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_delegations` (`from_course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_delegations` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_delegations` (`to_course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_discipline` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_discipline` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_dossier_filling` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_drill` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_drill` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_education` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_family_members` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_images` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_interview_field_values` (`field_id`) -> `public.interview_template_fields` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_interview_field_values` (`interview_id`) -> `public.oc_interviews` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_interview_group_rows` (`group_id`) -> `public.interview_template_groups` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_interview_group_rows` (`interview_id`) -> `public.oc_interviews` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_interview_group_values` (`field_id`) -> `public.interview_template_fields` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_interview_group_values` (`row_id`) -> `public.oc_interview_group_rows` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_interviews` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_interviews` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_interviews` (`template_id`) -> `public.interview_templates` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_medical_category` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_medicals` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_motivation_awards` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_motivation_awards` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_obstacle_training` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_obstacle_training` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_olq` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_olq` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_olq_category` (`course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_olq_score` (`oc_olq_id`) -> `public.oc_olq` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_olq_score` (`subtitle_id`) -> `public.oc_olq_subtitle` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_olq_subtitle` (`category_id`) -> `public.oc_olq_category` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_parent_comms` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_personal` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_pre_commission` (`course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_pre_commission` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_pre_commission` (`platoon_id`) -> `public.platoons` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_pre_commission` (`relegated_to_course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_pt_motivation_awards` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_pt_motivation_awards` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_pt_motivation_awards` (`pt_motivation_field_id`) -> `public.pt_motivation_award_fields` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_pt_task_scores` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_pt_task_scores` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_pt_task_scores` (`pt_task_score_id`) -> `public.pt_task_scores` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_recording_leave_hike_detention` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_recording_leave_hike_detention` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_relegations` (`from_course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_relegations` (`from_enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_relegations` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_relegations` (`performed_by_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_relegations` (`to_course_id`) -> `public.courses` (`id`) [on update: NO ACTION, on delete: RESTRICT]
- `public.oc_relegations` (`to_enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_semester_marks` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_semester_marks` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_special_achievement_in_clubs` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_special_achievement_in_clubs` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_special_achievement_in_firing` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_speed_march` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_speed_march` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_sports_and_games` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_sports_and_games` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_spr_records` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_spr_records` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_ssb_points` (`author_user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_ssb_points` (`report_id`) -> `public.oc_ssb_reports` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_ssb_reports` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.oc_weapon_training` (`enrollment_id`) -> `public.oc_course_enrollments` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.oc_weapon_training` (`oc_id`) -> `public.oc_cadets` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.permission_field_rules` (`permission_id`) -> `public.permissions` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.permission_field_rules` (`position_id`) -> `public.positions` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.permission_field_rules` (`role_id`) -> `public.roles` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.position_permissions` (`permission_id`) -> `public.permissions` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.position_permissions` (`position_id`) -> `public.positions` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.pt_attempt_grades` (`pt_attempt_id`) -> `public.pt_type_attempts` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.pt_task_scores` (`pt_attempt_grade_id`) -> `public.pt_attempt_grades` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.pt_task_scores` (`pt_attempt_id`) -> `public.pt_type_attempts` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.pt_task_scores` (`pt_task_id`) -> `public.pt_tasks` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.pt_tasks` (`pt_type_id`) -> `public.pt_types` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.pt_type_attempts` (`pt_type_id`) -> `public.pt_types` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.role_permissions` (`permission_id`) -> `public.permissions` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.role_permissions` (`role_id`) -> `public.roles` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.signup_requests` (`resolved_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.signup_requests` (`user_id`) -> `public.users` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.site_settings` (`updated_by`) -> `public.users` (`id`) [on update: NO ACTION, on delete: SET NULL]
- `public.training_camp_activities` (`training_camp_id`) -> `public.training_camps` (`id`) [on update: NO ACTION, on delete: CASCADE]
- `public.users` (`appoint_id`) -> `public.positions` (`id`) [on update: NO ACTION, on delete: SET NULL]
