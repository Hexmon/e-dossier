ALTER TABLE "device_site_settings"
  ADD COLUMN IF NOT EXISTS "theme_preset" varchar(32) DEFAULT 'navy-steel';
--> statement-breakpoint

ALTER TABLE "device_site_settings"
  ADD COLUMN IF NOT EXISTS "accent_palette" varchar(16) DEFAULT 'blue';
--> statement-breakpoint

UPDATE "device_site_settings"
SET
  "theme" = CASE
    WHEN "theme" IN ('light', 'dark', 'system') THEN "theme"
    ELSE 'system'
  END,
  "theme_preset" = 'navy-steel',
  "accent_palette" = CASE
    WHEN "accent_palette" IN ('blue', 'teal', 'amber', 'purple', 'red') THEN "accent_palette"
    ELSE 'blue'
  END,
  "layout_density" = CASE
    WHEN "layout_density" IN ('compact', 'comfortable') THEN "layout_density"
    ELSE 'comfortable'
  END,
  "language" = 'en',
  "timezone" = 'Asia/Kolkata',
  "refresh_interval" = LEAST(900, GREATEST(10, COALESCE("refresh_interval", 60)));
--> statement-breakpoint

ALTER TABLE "device_site_settings"
  ALTER COLUMN "theme" SET DEFAULT 'system',
  ALTER COLUMN "theme_preset" SET DEFAULT 'navy-steel',
  ALTER COLUMN "accent_palette" SET DEFAULT 'blue',
  ALTER COLUMN "layout_density" SET DEFAULT 'comfortable',
  ALTER COLUMN "language" SET DEFAULT 'en',
  ALTER COLUMN "timezone" SET DEFAULT 'Asia/Kolkata',
  ALTER COLUMN "refresh_interval" SET DEFAULT 60,
  ALTER COLUMN "theme_preset" SET NOT NULL,
  ALTER COLUMN "accent_palette" SET NOT NULL,
  ALTER COLUMN "timezone" SET NOT NULL,
  ALTER COLUMN "refresh_interval" SET NOT NULL;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "device_site_settings"
    ADD CONSTRAINT "device_site_settings_theme_chk"
      CHECK ("theme" IN ('light', 'dark', 'system'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "device_site_settings"
    ADD CONSTRAINT "device_site_settings_theme_preset_chk"
      CHECK ("theme_preset" IN ('navy-steel'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "device_site_settings"
    ADD CONSTRAINT "device_site_settings_accent_palette_chk"
      CHECK ("accent_palette" IN ('blue', 'teal', 'amber', 'purple', 'red'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "device_site_settings"
    ADD CONSTRAINT "device_site_settings_layout_density_chk"
      CHECK ("layout_density" IN ('compact', 'comfortable'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "device_site_settings"
    ADD CONSTRAINT "device_site_settings_language_chk"
      CHECK ("language" = 'en');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "device_site_settings"
    ADD CONSTRAINT "device_site_settings_timezone_chk"
      CHECK ("timezone" = 'Asia/Kolkata');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "device_site_settings"
    ADD CONSTRAINT "device_site_settings_refresh_interval_chk"
      CHECK ("refresh_interval" BETWEEN 10 AND 900);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
