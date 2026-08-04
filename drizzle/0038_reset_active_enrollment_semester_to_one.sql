-- Intentionally a no-op. New enrollments already default to semester 1, while
-- existing enrollment semesters must survive deployments and migration replays.
DO $$ BEGIN
  NULL;
END $$;
