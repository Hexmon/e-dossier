ALTER TABLE "subjects" ADD COLUMN "no_of_phase_tests" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
UPDATE "subjects"
SET "no_of_phase_tests" = CASE
  WHEN "has_theory" = false THEN 0
  ELSE 2
END;--> statement-breakpoint
