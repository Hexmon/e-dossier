ALTER TABLE "oc_discipline" ALTER COLUMN "points_delta" TYPE numeric USING "points_delta"::numeric;
ALTER TABLE "oc_discipline" ALTER COLUMN "points_cumulative" TYPE numeric USING "points_cumulative"::numeric;
