CREATE TABLE IF NOT EXISTS "academic_grading_policy_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "singleton_key" text DEFAULT 'default' NOT NULL,
  "letter_grade_bands" jsonb NOT NULL,
  "grade_point_bands" jsonb NOT NULL,
  "sgpa_formula_template" text DEFAULT 'CREDIT_WEIGHTED' NOT NULL,
  "cgpa_formula_template" text DEFAULT 'CREDIT_WEIGHTED' NOT NULL,
  "rounding_scale" integer DEFAULT 2 NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "academic_grading_policy_rounding_scale_check" CHECK ("rounding_scale" BETWEEN 0 AND 6),
  CONSTRAINT "academic_grading_policy_sgpa_formula_check" CHECK ("sgpa_formula_template" IN ('CREDIT_WEIGHTED', 'SEMESTER_AVG')),
  CONSTRAINT "academic_grading_policy_cgpa_formula_check" CHECK ("cgpa_formula_template" IN ('CREDIT_WEIGHTED', 'SEMESTER_AVG'))
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic_grading_policy_settings" ADD CONSTRAINT "academic_grading_policy_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_academic_grading_policy_settings_singleton" ON "academic_grading_policy_settings" USING btree ("singleton_key");--> statement-breakpoint
INSERT INTO "academic_grading_policy_settings" (
  "singleton_key",
  "letter_grade_bands",
  "grade_point_bands",
  "sgpa_formula_template",
  "cgpa_formula_template",
  "rounding_scale"
) VALUES (
  'default',
  '[{"minMarks":80,"grade":"AP"},{"minMarks":70,"grade":"AO"},{"minMarks":60,"grade":"AM"},{"minMarks":55,"grade":"BP"},{"minMarks":50,"grade":"BO"},{"minMarks":45,"grade":"BM"},{"minMarks":41,"grade":"CP"},{"minMarks":38,"grade":"CO"},{"minMarks":35,"grade":"CM"},{"minMarks":0,"grade":"F"}]'::jsonb,
  '[{"minMarks":80,"points":9},{"minMarks":70,"points":8},{"minMarks":60,"points":7},{"minMarks":55,"points":6},{"minMarks":50,"points":5},{"minMarks":45,"points":4},{"minMarks":41,"points":3},{"minMarks":38,"points":2},{"minMarks":35,"points":1},{"minMarks":0,"points":0}]'::jsonb,
  'CREDIT_WEIGHTED',
  'CREDIT_WEIGHTED',
  2
) ON CONFLICT ("singleton_key") DO NOTHING;--> statement-breakpoint
