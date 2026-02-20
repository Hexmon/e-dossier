ALTER TABLE "oc_olq_category" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_olq_category" ADD CONSTRAINT "oc_olq_category_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
DROP INDEX IF EXISTS "uq_olq_category_code";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_olq_category_course_code_active" ON "oc_olq_category" USING btree ("course_id","code") WHERE "is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_olq_category_course_active_order" ON "oc_olq_category" USING btree ("course_id","is_active","display_order");--> statement-breakpoint

WITH source_categories AS (
    SELECT id, code, title, description, display_order
    FROM oc_olq_category
    WHERE course_id IS NULL
      AND is_active = true
),
active_courses AS (
    SELECT id
    FROM courses
    WHERE deleted_at IS NULL
),
categories_to_clone AS (
    SELECT
        ac.id AS course_id,
        sc.code,
        sc.title,
        sc.description,
        sc.display_order
    FROM source_categories sc
    CROSS JOIN active_courses ac
    WHERE NOT EXISTS (
        SELECT 1
        FROM oc_olq_category existing
        WHERE existing.course_id = ac.id
          AND existing.code = sc.code
          AND existing.is_active = true
    )
)
INSERT INTO oc_olq_category (
    id, course_id, code, title, description, display_order, is_active, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    ctc.course_id,
    ctc.code,
    ctc.title,
    ctc.description,
    ctc.display_order,
    true,
    now(),
    now()
FROM categories_to_clone ctc;--> statement-breakpoint

WITH source_subtitles AS (
    SELECT
        src_cat.code AS category_code,
        src_sub.subtitle,
        src_sub.max_marks,
        src_sub.display_order
    FROM oc_olq_subtitle src_sub
    INNER JOIN oc_olq_category src_cat ON src_cat.id = src_sub.category_id
    WHERE src_cat.course_id IS NULL
      AND src_cat.is_active = true
      AND src_sub.is_active = true
),
target_categories AS (
    SELECT id, course_id, code
    FROM oc_olq_category
    WHERE course_id IS NOT NULL
      AND is_active = true
),
subtitles_to_clone AS (
    SELECT
        tc.id AS target_category_id,
        ss.subtitle,
        ss.max_marks,
        ss.display_order
    FROM target_categories tc
    INNER JOIN source_subtitles ss ON ss.category_code = tc.code
    WHERE NOT EXISTS (
        SELECT 1
        FROM oc_olq_subtitle existing_sub
        WHERE existing_sub.category_id = tc.id
          AND existing_sub.subtitle = ss.subtitle
    )
)
INSERT INTO oc_olq_subtitle (
    id, category_id, subtitle, max_marks, display_order, is_active, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    stc.target_category_id,
    stc.subtitle,
    stc.max_marks,
    stc.display_order,
    true,
    now(),
    now()
FROM subtitles_to_clone stc;--> statement-breakpoint

UPDATE oc_olq_subtitle legacy_sub
SET is_active = false,
    updated_at = now()
FROM oc_olq_category legacy_cat
WHERE legacy_sub.category_id = legacy_cat.id
  AND legacy_cat.course_id IS NULL
  AND legacy_sub.is_active = true;--> statement-breakpoint

UPDATE oc_olq_category
SET is_active = false,
    updated_at = now()
WHERE course_id IS NULL
  AND is_active = true;--> statement-breakpoint
