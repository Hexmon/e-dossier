ALTER TABLE "pt_types" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "pt_types" ADD CONSTRAINT "pt_types_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pt_motivation_award_fields" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "pt_motivation_award_fields" ADD CONSTRAINT "pt_motivation_award_fields_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "training_camps" ADD CONSTRAINT "training_camps_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_templates" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "interview_templates" ADD CONSTRAINT "interview_templates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

DROP INDEX IF EXISTS "uq_pt_type_semester_code";--> statement-breakpoint
DROP INDEX IF EXISTS "uq_pt_motivation_field_semester";--> statement-breakpoint
DROP INDEX IF EXISTS "uq_training_camp_name_semester";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_training_camp_semester_sort_name";--> statement-breakpoint
DROP INDEX IF EXISTS "uq_interview_template_code";--> statement-breakpoint

CREATE UNIQUE INDEX "uq_pt_type_course_semester_code" ON "pt_types" USING btree ("course_id","semester","code");--> statement-breakpoint
CREATE INDEX "idx_pt_type_course_semester_sort" ON "pt_types" USING btree ("course_id","semester","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pt_motivation_field_course_semester" ON "pt_motivation_award_fields" USING btree ("course_id","semester","label");--> statement-breakpoint
CREATE INDEX "idx_pt_motivation_field_course_semester_sort" ON "pt_motivation_award_fields" USING btree ("course_id","semester","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_training_camp_name_course_semester" ON "training_camps" USING btree ("course_id","name","semester");--> statement-breakpoint
CREATE INDEX "idx_training_camp_course_semester_sort_name" ON "training_camps" USING btree ("course_id","semester","sort_order","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_interview_template_course_code" ON "interview_templates" USING btree ("course_id","code");--> statement-breakpoint
CREATE INDEX "idx_interview_template_course_sort" ON "interview_templates" USING btree ("course_id","sort_order");--> statement-breakpoint

CREATE TEMP TABLE tmp_pt_type_map (
    source_type_id uuid NOT NULL,
    target_type_id uuid NOT NULL,
    course_id uuid NOT NULL
) ON COMMIT DROP;--> statement-breakpoint

WITH active_courses AS (
    SELECT id
    FROM courses
    WHERE deleted_at IS NULL
),
rows_to_clone AS (
    SELECT
        pt.id AS source_type_id,
        gen_random_uuid() AS target_type_id,
        c.id AS course_id,
        pt.semester,
        pt.code,
        pt.title,
        pt.description,
        pt.max_total_marks,
        pt.sort_order,
        pt.is_active,
        pt.created_at,
        pt.updated_at,
        pt.deleted_at
    FROM pt_types pt
    CROSS JOIN active_courses c
    WHERE pt.course_id IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM pt_types existing
          WHERE existing.course_id = c.id
            AND existing.semester = pt.semester
            AND existing.code = pt.code
      )
)
INSERT INTO pt_types (
    id, course_id, semester, code, title, description, max_total_marks, sort_order, is_active, created_at, updated_at, deleted_at
)
SELECT
    target_type_id, course_id, semester, code, title, description, max_total_marks, sort_order, is_active, created_at, updated_at, deleted_at
FROM rows_to_clone;--> statement-breakpoint

INSERT INTO tmp_pt_type_map (source_type_id, target_type_id, course_id)
WITH active_courses AS (
    SELECT id
    FROM courses
    WHERE deleted_at IS NULL
)
SELECT
    pt.id AS source_type_id,
    cloned.id AS target_type_id,
    c.id AS course_id
FROM pt_types pt
CROSS JOIN active_courses c
INNER JOIN pt_types cloned
    ON cloned.course_id = c.id
   AND cloned.semester = pt.semester
   AND cloned.code = pt.code
WHERE pt.course_id IS NULL;--> statement-breakpoint

CREATE TEMP TABLE tmp_pt_attempt_map (
    source_attempt_id uuid NOT NULL,
    target_attempt_id uuid NOT NULL,
    course_id uuid NOT NULL
) ON COMMIT DROP;--> statement-breakpoint

WITH rows_to_clone AS (
    SELECT
        a.id AS source_attempt_id,
        gen_random_uuid() AS target_attempt_id,
        m.course_id,
        m.target_type_id AS target_pt_type_id,
        a.code,
        a.label,
        a.is_compensatory,
        a.sort_order,
        a.is_active,
        a.created_at,
        a.updated_at,
        a.deleted_at
    FROM pt_type_attempts a
    INNER JOIN tmp_pt_type_map m ON m.source_type_id = a.pt_type_id
)
INSERT INTO pt_type_attempts (
    id, pt_type_id, code, label, is_compensatory, sort_order, is_active, created_at, updated_at, deleted_at
)
SELECT
    target_attempt_id, target_pt_type_id, code, label, is_compensatory, sort_order, is_active, created_at, updated_at, deleted_at
FROM rows_to_clone;--> statement-breakpoint

INSERT INTO tmp_pt_attempt_map (source_attempt_id, target_attempt_id, course_id)
SELECT a.id, cloned.id, m.course_id
FROM pt_type_attempts a
INNER JOIN tmp_pt_type_map m ON m.source_type_id = a.pt_type_id
INNER JOIN pt_type_attempts cloned
    ON cloned.pt_type_id = m.target_type_id
   AND cloned.code = a.code;--> statement-breakpoint

CREATE TEMP TABLE tmp_pt_grade_map (
    source_grade_id uuid NOT NULL,
    target_grade_id uuid NOT NULL,
    course_id uuid NOT NULL
) ON COMMIT DROP;--> statement-breakpoint

WITH rows_to_clone AS (
    SELECT
        g.id AS source_grade_id,
        gen_random_uuid() AS target_grade_id,
        m.course_id,
        m.target_attempt_id AS target_pt_attempt_id,
        g.code,
        g.label,
        g.sort_order,
        g.is_active,
        g.created_at,
        g.updated_at,
        g.deleted_at
    FROM pt_attempt_grades g
    INNER JOIN tmp_pt_attempt_map m ON m.source_attempt_id = g.pt_attempt_id
)
INSERT INTO pt_attempt_grades (
    id, pt_attempt_id, code, label, sort_order, is_active, created_at, updated_at, deleted_at
)
SELECT
    target_grade_id, target_pt_attempt_id, code, label, sort_order, is_active, created_at, updated_at, deleted_at
FROM rows_to_clone;--> statement-breakpoint

INSERT INTO tmp_pt_grade_map (source_grade_id, target_grade_id, course_id)
SELECT g.id, cloned.id, m.course_id
FROM pt_attempt_grades g
INNER JOIN tmp_pt_attempt_map m ON m.source_attempt_id = g.pt_attempt_id
INNER JOIN pt_attempt_grades cloned
    ON cloned.pt_attempt_id = m.target_attempt_id
   AND cloned.code = g.code;--> statement-breakpoint

CREATE TEMP TABLE tmp_pt_task_map (
    source_task_id uuid NOT NULL,
    target_task_id uuid NOT NULL,
    course_id uuid NOT NULL
) ON COMMIT DROP;--> statement-breakpoint

WITH rows_to_clone AS (
    SELECT
        t.id AS source_task_id,
        gen_random_uuid() AS target_task_id,
        m.course_id,
        m.target_type_id AS target_pt_type_id,
        t.title,
        t.max_marks,
        t.sort_order,
        t.created_at,
        t.updated_at,
        t.deleted_at
    FROM pt_tasks t
    INNER JOIN tmp_pt_type_map m ON m.source_type_id = t.pt_type_id
)
INSERT INTO pt_tasks (
    id, pt_type_id, title, max_marks, sort_order, created_at, updated_at, deleted_at
)
SELECT
    target_task_id, target_pt_type_id, title, max_marks, sort_order, created_at, updated_at, deleted_at
FROM rows_to_clone;--> statement-breakpoint

INSERT INTO tmp_pt_task_map (source_task_id, target_task_id, course_id)
SELECT t.id, cloned.id, m.course_id
FROM pt_tasks t
INNER JOIN tmp_pt_type_map m ON m.source_type_id = t.pt_type_id
INNER JOIN pt_tasks cloned
    ON cloned.pt_type_id = m.target_type_id
   AND cloned.title = t.title;--> statement-breakpoint

INSERT INTO pt_task_scores (
    id, pt_task_id, pt_attempt_id, pt_attempt_grade_id, max_marks, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    task_map.target_task_id,
    attempt_map.target_attempt_id,
    grade_map.target_grade_id,
    s.max_marks,
    s.created_at,
    s.updated_at
FROM pt_task_scores s
INNER JOIN tmp_pt_task_map task_map ON task_map.source_task_id = s.pt_task_id
INNER JOIN tmp_pt_attempt_map attempt_map
    ON attempt_map.source_attempt_id = s.pt_attempt_id
   AND attempt_map.course_id = task_map.course_id
INNER JOIN tmp_pt_grade_map grade_map
    ON grade_map.source_grade_id = s.pt_attempt_grade_id
   AND grade_map.course_id = task_map.course_id;--> statement-breakpoint

WITH active_courses AS (
    SELECT id
    FROM courses
    WHERE deleted_at IS NULL
),
rows_to_clone AS (
    SELECT
        gen_random_uuid() AS target_field_id,
        c.id AS course_id,
        f.semester,
        f.label,
        f.sort_order,
        f.is_active,
        f.created_at,
        f.updated_at,
        f.deleted_at
    FROM pt_motivation_award_fields f
    CROSS JOIN active_courses c
    WHERE f.course_id IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM pt_motivation_award_fields existing
          WHERE existing.course_id = c.id
            AND existing.semester = f.semester
            AND existing.label = f.label
      )
)
INSERT INTO pt_motivation_award_fields (
    id, course_id, semester, label, sort_order, is_active, created_at, updated_at, deleted_at
)
SELECT
    target_field_id, course_id, semester, label, sort_order, is_active, created_at, updated_at, deleted_at
FROM rows_to_clone;--> statement-breakpoint

CREATE TEMP TABLE tmp_training_camp_map (
    source_camp_id uuid NOT NULL,
    target_camp_id uuid NOT NULL,
    course_id uuid NOT NULL
) ON COMMIT DROP;--> statement-breakpoint

WITH active_courses AS (
    SELECT id
    FROM courses
    WHERE deleted_at IS NULL
),
rows_to_clone AS (
    SELECT
        camp.id AS source_camp_id,
        gen_random_uuid() AS target_camp_id,
        c.id AS course_id,
        camp.name,
        camp.semester,
        camp.sort_order,
        camp.max_total_marks,
        camp.performance_title,
        camp.performance_guidance,
        camp.signature_primary_label,
        camp.signature_secondary_label,
        camp.note_line_1,
        camp.note_line_2,
        camp.show_aggregate_summary,
        camp.created_at,
        camp.updated_at,
        camp.deleted_at
    FROM training_camps camp
    CROSS JOIN active_courses c
    WHERE camp.course_id IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM training_camps existing
          WHERE existing.course_id = c.id
            AND existing.name = camp.name
            AND existing.semester = camp.semester
      )
)
INSERT INTO training_camps (
    id, course_id, name, semester, sort_order, max_total_marks, performance_title, performance_guidance,
    signature_primary_label, signature_secondary_label, note_line_1, note_line_2, show_aggregate_summary,
    created_at, updated_at, deleted_at
)
SELECT
    target_camp_id, course_id, name, semester, sort_order, max_total_marks, performance_title, performance_guidance,
    signature_primary_label, signature_secondary_label, note_line_1, note_line_2, show_aggregate_summary,
    created_at, updated_at, deleted_at
FROM rows_to_clone;--> statement-breakpoint

INSERT INTO tmp_training_camp_map (source_camp_id, target_camp_id, course_id)
WITH active_courses AS (
    SELECT id
    FROM courses
    WHERE deleted_at IS NULL
)
SELECT
    camp.id AS source_camp_id,
    cloned.id AS target_camp_id,
    c.id AS course_id
FROM training_camps camp
CROSS JOIN active_courses c
INNER JOIN training_camps cloned
    ON cloned.course_id = c.id
   AND cloned.name = camp.name
   AND cloned.semester = camp.semester
WHERE camp.course_id IS NULL;--> statement-breakpoint

INSERT INTO training_camp_activities (
    id, training_camp_id, name, default_max_marks, sort_order, created_at, updated_at, deleted_at
)
SELECT
    gen_random_uuid(),
    camp_map.target_camp_id,
    activity.name,
    activity.default_max_marks,
    activity.sort_order,
    activity.created_at,
    activity.updated_at,
    activity.deleted_at
FROM training_camp_activities activity
INNER JOIN tmp_training_camp_map camp_map ON camp_map.source_camp_id = activity.training_camp_id;--> statement-breakpoint

CREATE TEMP TABLE tmp_interview_template_map (
    source_template_id uuid NOT NULL,
    target_template_id uuid NOT NULL,
    course_id uuid NOT NULL
) ON COMMIT DROP;--> statement-breakpoint

WITH active_courses AS (
    SELECT id
    FROM courses
    WHERE deleted_at IS NULL
),
rows_to_clone AS (
    SELECT
        template.id AS source_template_id,
        gen_random_uuid() AS target_template_id,
        c.id AS course_id,
        template.code,
        template.title,
        template.description,
        template.allow_multiple,
        template.sort_order,
        template.is_active,
        template.created_at,
        template.updated_at,
        template.deleted_at
    FROM interview_templates template
    CROSS JOIN active_courses c
    WHERE template.course_id IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM interview_templates existing
          WHERE existing.course_id = c.id
            AND existing.code = template.code
      )
)
INSERT INTO interview_templates (
    id, course_id, code, title, description, allow_multiple, sort_order, is_active, created_at, updated_at, deleted_at
)
SELECT
    target_template_id, course_id, code, title, description, allow_multiple, sort_order, is_active, created_at, updated_at, deleted_at
FROM rows_to_clone;--> statement-breakpoint

INSERT INTO tmp_interview_template_map (source_template_id, target_template_id, course_id)
WITH active_courses AS (
    SELECT id
    FROM courses
    WHERE deleted_at IS NULL
)
SELECT
    template.id AS source_template_id,
    cloned.id AS target_template_id,
    c.id AS course_id
FROM interview_templates template
CROSS JOIN active_courses c
INNER JOIN interview_templates cloned
    ON cloned.course_id = c.id
   AND cloned.code = template.code
WHERE template.course_id IS NULL;--> statement-breakpoint

INSERT INTO interview_template_semesters (
    id, template_id, semester, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    map.target_template_id,
    sem.semester,
    sem.created_at,
    sem.updated_at
FROM interview_template_semesters sem
INNER JOIN tmp_interview_template_map map ON map.source_template_id = sem.template_id;--> statement-breakpoint

CREATE TEMP TABLE tmp_interview_section_map (
    source_section_id uuid NOT NULL,
    target_section_id uuid NOT NULL,
    course_id uuid NOT NULL
) ON COMMIT DROP;--> statement-breakpoint

WITH rows_to_clone AS (
    SELECT
        section.id AS source_section_id,
        gen_random_uuid() AS target_section_id,
        map.course_id,
        map.target_template_id,
        section.title,
        section.description,
        section.sort_order,
        section.is_active,
        section.created_at,
        section.updated_at,
        section.deleted_at
    FROM interview_template_sections section
    INNER JOIN tmp_interview_template_map map ON map.source_template_id = section.template_id
)
INSERT INTO interview_template_sections (
    id, template_id, title, description, sort_order, is_active, created_at, updated_at, deleted_at
)
SELECT
    target_section_id, target_template_id, title, description, sort_order, is_active, created_at, updated_at, deleted_at
FROM rows_to_clone;--> statement-breakpoint

INSERT INTO tmp_interview_section_map (source_section_id, target_section_id, course_id)
SELECT section.id, cloned.id, map.course_id
FROM interview_template_sections section
INNER JOIN tmp_interview_template_map map ON map.source_template_id = section.template_id
INNER JOIN interview_template_sections cloned
    ON cloned.template_id = map.target_template_id
   AND cloned.title = section.title
   AND cloned.sort_order = section.sort_order;--> statement-breakpoint

CREATE TEMP TABLE tmp_interview_group_map (
    source_group_id uuid NOT NULL,
    target_group_id uuid NOT NULL,
    course_id uuid NOT NULL
) ON COMMIT DROP;--> statement-breakpoint

WITH rows_to_clone AS (
    SELECT
        grp.id AS source_group_id,
        gen_random_uuid() AS target_group_id,
        map.course_id,
        map.target_template_id,
        section_map.target_section_id,
        grp.title,
        grp.min_rows,
        grp.max_rows,
        grp.sort_order,
        grp.is_active,
        grp.created_at,
        grp.updated_at,
        grp.deleted_at
    FROM interview_template_groups grp
    INNER JOIN tmp_interview_template_map map ON map.source_template_id = grp.template_id
    LEFT JOIN tmp_interview_section_map section_map
        ON section_map.source_section_id = grp.section_id
       AND section_map.course_id = map.course_id
)
INSERT INTO interview_template_groups (
    id, template_id, section_id, title, min_rows, max_rows, sort_order, is_active, created_at, updated_at, deleted_at
)
SELECT
    target_group_id, target_template_id, target_section_id, title, min_rows, max_rows, sort_order, is_active, created_at, updated_at, deleted_at
FROM rows_to_clone;--> statement-breakpoint

INSERT INTO tmp_interview_group_map (source_group_id, target_group_id, course_id)
SELECT grp.id, cloned.id, map.course_id
FROM interview_template_groups grp
INNER JOIN tmp_interview_template_map map ON map.source_template_id = grp.template_id
INNER JOIN interview_template_groups cloned
    ON cloned.template_id = map.target_template_id
   AND cloned.title = grp.title
   AND cloned.sort_order = grp.sort_order;--> statement-breakpoint

CREATE TEMP TABLE tmp_interview_field_map (
    source_field_id uuid NOT NULL,
    target_field_id uuid NOT NULL,
    course_id uuid NOT NULL
) ON COMMIT DROP;--> statement-breakpoint

WITH rows_to_clone AS (
    SELECT
        field.id AS source_field_id,
        gen_random_uuid() AS target_field_id,
        map.course_id,
        map.target_template_id,
        section_map.target_section_id,
        group_map.target_group_id,
        field.key,
        field.label,
        field.field_type,
        field.required,
        field.help_text,
        field.max_length,
        field.sort_order,
        field.is_active,
        field.capture_filed_at,
        field.capture_signature,
        field.created_at,
        field.updated_at,
        field.deleted_at
    FROM interview_template_fields field
    INNER JOIN tmp_interview_template_map map ON map.source_template_id = field.template_id
    LEFT JOIN tmp_interview_section_map section_map
        ON section_map.source_section_id = field.section_id
       AND section_map.course_id = map.course_id
    LEFT JOIN tmp_interview_group_map group_map
        ON group_map.source_group_id = field.group_id
       AND group_map.course_id = map.course_id
)
INSERT INTO interview_template_fields (
    id, template_id, section_id, group_id, key, label, field_type, required, help_text, max_length, sort_order,
    is_active, capture_filed_at, capture_signature, created_at, updated_at, deleted_at
)
SELECT
    target_field_id, target_template_id, target_section_id, target_group_id, key, label, field_type, required, help_text, max_length, sort_order,
    is_active, capture_filed_at, capture_signature, created_at, updated_at, deleted_at
FROM rows_to_clone;--> statement-breakpoint

INSERT INTO tmp_interview_field_map (source_field_id, target_field_id, course_id)
SELECT field.id, cloned.id, map.course_id
FROM interview_template_fields field
INNER JOIN tmp_interview_template_map map ON map.source_template_id = field.template_id
INNER JOIN interview_template_fields cloned
    ON cloned.template_id = map.target_template_id
   AND cloned.key = field.key;--> statement-breakpoint

INSERT INTO interview_template_field_options (
    id, field_id, code, label, sort_order, is_active, created_at, updated_at, deleted_at
)
SELECT
    gen_random_uuid(),
    field_map.target_field_id,
    opt.code,
    opt.label,
    opt.sort_order,
    opt.is_active,
    opt.created_at,
    opt.updated_at,
    opt.deleted_at
FROM interview_template_field_options opt
INNER JOIN tmp_interview_field_map field_map ON field_map.source_field_id = opt.field_id;--> statement-breakpoint
