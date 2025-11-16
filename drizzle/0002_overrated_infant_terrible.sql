ALTER TABLE "oc_sports_and_games" ALTER COLUMN "term" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."term_kind";--> statement-breakpoint
CREATE TYPE "public"."term_kind" AS ENUM('SPRING', 'AUTUMN');--> statement-breakpoint
ALTER TABLE "oc_sports_and_games" ALTER COLUMN "term" SET DATA TYPE "public"."term_kind" USING "term"::"public"."term_kind";--> statement-breakpoint
ALTER TABLE "oc_motivation_awards" ALTER COLUMN "max_marks" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_motivation_awards" ALTER COLUMN "marks_obtained" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_obstacle_training" ALTER COLUMN "marks_obtained" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_speed_march" ALTER COLUMN "marks" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_sports_and_games" ALTER COLUMN "max_marks" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_sports_and_games" ALTER COLUMN "marks_obtained" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_weapon_training" ALTER COLUMN "max_marks" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_weapon_training" ALTER COLUMN "marks_obtained" SET DATA TYPE numeric;