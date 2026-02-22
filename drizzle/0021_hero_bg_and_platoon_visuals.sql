ALTER TABLE "site_settings"
  ADD COLUMN "hero_bg_url" text,
  ADD COLUMN "hero_bg_object_key" text;

ALTER TABLE "platoons"
  ADD COLUMN "theme_color" varchar(7) DEFAULT '#1D4ED8' NOT NULL,
  ADD COLUMN "image_url" text,
  ADD COLUMN "image_object_key" text;
