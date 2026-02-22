ALTER TABLE "platoons" ADD COLUMN "theme_color" varchar(7) DEFAULT '#1D4ED8' NOT NULL;--> statement-breakpoint
ALTER TABLE "platoons" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "platoons" ADD COLUMN "image_object_key" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "hero_bg_url" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "hero_bg_object_key" text;