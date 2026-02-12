ALTER TABLE "oc_medicals" ALTER COLUMN "age" TYPE numeric USING "age"::numeric;--> statement-breakpoint
ALTER TABLE "oc_medicals" ALTER COLUMN "height_cm" TYPE numeric USING "height_cm"::numeric;--> statement-breakpoint
ALTER TABLE "oc_medicals" ALTER COLUMN "ibw_kg" TYPE numeric USING "ibw_kg"::numeric;--> statement-breakpoint
ALTER TABLE "oc_medicals" ALTER COLUMN "abw_kg" TYPE numeric USING "abw_kg"::numeric;--> statement-breakpoint
ALTER TABLE "oc_medicals" ALTER COLUMN "overwt_pct" TYPE numeric USING "overwt_pct"::numeric;--> statement-breakpoint
ALTER TABLE "oc_medicals" ALTER COLUMN "bmi" TYPE numeric USING "bmi"::numeric;--> statement-breakpoint
ALTER TABLE "oc_medicals" ALTER COLUMN "chest_cm" TYPE numeric USING "chest_cm"::numeric;--> statement-breakpoint
