CREATE TYPE "public"."oc_movement_kind" AS ENUM('TRANSFER', 'PROMOTION_BATCH', 'PROMOTION_EXCEPTION');--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD COLUMN "movement_kind" "oc_movement_kind" DEFAULT 'TRANSFER' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_oc_relegations_movement_kind_performed_at" ON "oc_relegations" USING btree ("movement_kind","performed_at");