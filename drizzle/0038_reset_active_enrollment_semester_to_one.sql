UPDATE "oc_course_enrollments"
SET "current_semester" = 1,
    "updated_at" = now()
WHERE "status" = 'ACTIVE';
