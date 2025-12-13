CREATE TABLE "oc_semester_marks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "oc_id" uuid NOT NULL REFERENCES "oc_cadets"("id") ON DELETE CASCADE,
    "semester" integer NOT NULL,
    "branch_tag" varchar(1) NOT NULL,
    "sgpa" numeric,
    "cgpa" numeric,
    "marks_scored" numeric,
    "subjects" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "deleted_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "ck_oc_semester_marks_semester" CHECK ("semester" BETWEEN 1 AND 6)
);

CREATE UNIQUE INDEX "uq_oc_semester_marks" ON "oc_semester_marks" ("oc_id", "semester");
