ALTER TABLE "site_history" RENAME COLUMN "year_or_date" TO "incident_date";
ALTER TABLE "site_history" ALTER COLUMN "incident_date" TYPE timestamp USING "incident_date"::timestamp;