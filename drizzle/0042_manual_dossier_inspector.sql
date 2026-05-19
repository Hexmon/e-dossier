ALTER TABLE "dossier_inspections" ALTER COLUMN "inspector_user_id" DROP NOT NULL;
ALTER TABLE "dossier_inspections" ADD COLUMN "inspector_name" text;
ALTER TABLE "dossier_inspections" ADD COLUMN "inspector_rank" text;
ALTER TABLE "dossier_inspections" ADD COLUMN "inspector_appointment" text;
