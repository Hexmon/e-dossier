import { and, eq } from "drizzle-orm";
import { db } from "@/app/db/client";
import { platoons } from "@/app/db/schema/auth/platoons";
import { DEFAULT_PLATOON_THEME_COLOR, normalizePlatoonThemeColor } from "@/lib/platoon-theme";
import defaultPlatoonTemplatePack from "@/app/lib/bootstrap/templates/platoon/default.v1.json";
import type {
  PlatoonTemplate,
  PlatoonTemplateApplyResult,
  PlatoonTemplatePack,
  PlatoonTemplateProfile,
  PtTemplateApplyStats,
} from "@/app/lib/bootstrap/types";

type ApplyPlatoonTemplateProfileInput = {
  profile?: PlatoonTemplateProfile;
  dryRun?: boolean;
  actorUserId?: string;
};

type MutableStats = {
  platoons: PtTemplateApplyStats;
};

type ApplyContext = {
  now: Date;
  dryRun: boolean;
  warnings: string[];
  stats: MutableStats;
};

type DbExecutor = Pick<typeof db, "select" | "insert" | "update">;

const DEFAULT_PROFILE: PlatoonTemplateProfile = "default";
const DEFAULT_TEMPLATE = defaultPlatoonTemplatePack as PlatoonTemplatePack;

class DryRunRollbackError extends Error {
  constructor(public readonly result: PlatoonTemplateApplyResult) {
    super("Platoon template dry-run rollback");
  }
}

function createStats(): MutableStats {
  return {
    platoons: { created: 0, updated: 0, skipped: 0 },
  };
}

function selectPack(profile: PlatoonTemplateProfile = DEFAULT_PROFILE): PlatoonTemplatePack {
  if (profile !== DEFAULT_PROFILE) {
    throw new Error(`Unsupported platoon template profile "${profile}". Supported: ${DEFAULT_PROFILE}`);
  }
  return DEFAULT_TEMPLATE;
}

export function getPlatoonTemplatePack(
  profile: PlatoonTemplateProfile = DEFAULT_PROFILE
): PlatoonTemplatePack {
  return selectPack(profile);
}

function markCreated(stats: PtTemplateApplyStats): void {
  stats.created += 1;
}

function markUpdated(stats: PtTemplateApplyStats): void {
  stats.updated += 1;
}

function markSkipped(stats: PtTemplateApplyStats): void {
  stats.skipped += 1;
}

function normalizeNullable(value: unknown): unknown {
  return value ?? null;
}

function needsChange<T extends Record<string, unknown>>(
  current: Record<string, unknown>,
  next: T
): boolean {
  return Object.entries(next).some(
    ([key, value]) => normalizeNullable(current[key]) !== normalizeNullable(value)
  );
}

function toResult(ctx: ApplyContext, profile: PlatoonTemplateProfile): PlatoonTemplateApplyResult {
  const createdCount = ctx.stats.platoons.created;
  const updatedCount = ctx.stats.platoons.updated;
  const skippedCount = ctx.stats.platoons.skipped;

  return {
    module: "platoon",
    profile,
    dryRun: ctx.dryRun,
    createdCount,
    updatedCount,
    skippedCount,
    warnings: ctx.warnings,
    stats: ctx.stats,
  };
}

async function upsertPlatoon(
  tx: DbExecutor,
  ctx: ApplyContext,
  templatePlatoon: PlatoonTemplate
): Promise<void> {
  const normalizedKey = templatePlatoon.key.trim().toUpperCase();
  const normalizedName = templatePlatoon.name.trim();
  const normalizedThemeColor = normalizePlatoonThemeColor(
    templatePlatoon.themeColor ?? DEFAULT_PLATOON_THEME_COLOR
  );

  const [existing] = await tx
    .select({
      id: platoons.id,
      key: platoons.key,
      name: platoons.name,
      about: platoons.about,
      themeColor: platoons.themeColor,
      deletedAt: platoons.deletedAt,
    })
    .from(platoons)
    .where(eq(platoons.key, normalizedKey))
    .limit(1);

  if (!existing) {
    await tx.insert(platoons).values({
      key: normalizedKey,
      name: normalizedName,
      about: templatePlatoon.about ?? null,
      themeColor: normalizedThemeColor,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    });
    markCreated(ctx.stats.platoons);
    return;
  }

  const patch = {
    name: normalizedName,
    about: templatePlatoon.about ?? null,
    themeColor: normalizedThemeColor,
    deletedAt: null as Date | null,
  };

  if (!needsChange(existing, patch)) {
    markSkipped(ctx.stats.platoons);
    return;
  }

  await tx.update(platoons).set({ ...patch, updatedAt: ctx.now }).where(eq(platoons.id, existing.id));
  markUpdated(ctx.stats.platoons);
}

export async function applyPlatoonTemplateProfile(
  input: ApplyPlatoonTemplateProfileInput = {}
): Promise<PlatoonTemplateApplyResult> {
  const profile = input.profile ?? DEFAULT_PROFILE;
  const dryRun = input.dryRun ?? false;
  const pack = selectPack(profile);

  const ctx: ApplyContext = {
    now: new Date(),
    dryRun,
    warnings: [],
    stats: createStats(),
  };

  try {
    await db.transaction(async (tx) => {
      for (const templatePlatoon of pack.platoons) {
        await upsertPlatoon(tx, ctx, templatePlatoon);
      }

      if (ctx.dryRun) {
        throw new DryRunRollbackError(toResult(ctx, profile));
      }
    });
  } catch (error) {
    if (error instanceof DryRunRollbackError) {
      return error.result;
    }
    throw error;
  }

  return toResult(ctx, profile);
}

