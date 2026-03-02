import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/app/db/client";
import { appointments } from "@/app/db/schema/auth/appointments";
import { platoons } from "@/app/db/schema/auth/platoons";
import { positions } from "@/app/db/schema/auth/positions";
import { users } from "@/app/db/schema/auth/users";
import defaultAppointmentTemplatePack from "@/app/lib/bootstrap/templates/appointment/default.v1.json";
import type {
  AppointmentAssignmentTemplate,
  AppointmentPositionTemplate,
  AppointmentTemplateApplyResult,
  AppointmentTemplatePack,
  AppointmentTemplateProfile,
  PtTemplateApplyStats,
} from "@/app/lib/bootstrap/types";

type ApplyAppointmentTemplateProfileInput = {
  profile?: AppointmentTemplateProfile;
  dryRun?: boolean;
  actorUserId?: string;
};

type MutableStats = {
  positions: PtTemplateApplyStats;
  assignments: PtTemplateApplyStats;
};

type ApplyContext = {
  now: Date;
  dryRun: boolean;
  actorUserId?: string;
  warnings: string[];
  stats: MutableStats;
};

type DbExecutor = Pick<typeof db, "select" | "insert" | "update">;

const DEFAULT_PROFILE: AppointmentTemplateProfile = "default";
const DEFAULT_TEMPLATE = defaultAppointmentTemplatePack as AppointmentTemplatePack;
const TEMPLATE_REASON = "default appointment template";

class DryRunRollbackError extends Error {
  constructor(public readonly result: AppointmentTemplateApplyResult) {
    super("Appointment template dry-run rollback");
  }
}

function createStats(): MutableStats {
  const unit = (): PtTemplateApplyStats => ({ created: 0, updated: 0, skipped: 0 });
  return {
    positions: unit(),
    assignments: unit(),
  };
}

function selectPack(profile: AppointmentTemplateProfile = DEFAULT_PROFILE): AppointmentTemplatePack {
  if (profile !== DEFAULT_PROFILE) {
    throw new Error(`Unsupported appointment template profile "${profile}". Supported: ${DEFAULT_PROFILE}`);
  }
  return DEFAULT_TEMPLATE;
}

export function getAppointmentTemplatePack(
  profile: AppointmentTemplateProfile = DEFAULT_PROFILE
): AppointmentTemplatePack {
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

function toResult(ctx: ApplyContext, profile: AppointmentTemplateProfile): AppointmentTemplateApplyResult {
  const createdCount = ctx.stats.positions.created + ctx.stats.assignments.created;
  const updatedCount = ctx.stats.positions.updated + ctx.stats.assignments.updated;
  const skippedCount = ctx.stats.positions.skipped + ctx.stats.assignments.skipped;

  return {
    module: "appointment",
    profile,
    dryRun: ctx.dryRun,
    createdCount,
    updatedCount,
    skippedCount,
    warnings: ctx.warnings,
    stats: ctx.stats,
  };
}

async function upsertPosition(
  tx: DbExecutor,
  ctx: ApplyContext,
  templatePosition: AppointmentPositionTemplate
): Promise<string> {
  const normalizedKey = templatePosition.key.trim().toUpperCase();
  const normalizedDisplayName = templatePosition.displayName.trim();

  const [existing] = await tx
    .select({
      id: positions.id,
      displayName: positions.displayName,
      defaultScope: positions.defaultScope,
      singleton: positions.singleton,
      description: positions.description,
    })
    .from(positions)
    .where(eq(positions.key, normalizedKey))
    .limit(1);

  if (!existing) {
    const [created] = await tx
      .insert(positions)
      .values({
        key: normalizedKey,
        displayName: normalizedDisplayName,
        defaultScope: templatePosition.defaultScope,
        singleton: templatePosition.singleton,
        description: templatePosition.description ?? null,
      })
      .returning({ id: positions.id });
    markCreated(ctx.stats.positions);
    return created.id;
  }

  const patch = {
    displayName: normalizedDisplayName,
    defaultScope: templatePosition.defaultScope,
    singleton: templatePosition.singleton,
    description: templatePosition.description ?? null,
  };

  if (!needsChange(existing, patch)) {
    markSkipped(ctx.stats.positions);
    return existing.id;
  }

  const [updated] = await tx
    .update(positions)
    .set(patch)
    .where(eq(positions.id, existing.id))
    .returning({ id: positions.id });
  markUpdated(ctx.stats.positions);
  return updated.id;
}

async function resolveUserId(tx: DbExecutor, username: string): Promise<string | null> {
  const normalized = username.trim().toLowerCase();
  const [user] = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(sql`lower(${users.username})`, normalized), isNull(users.deletedAt)))
    .limit(1);
  return user?.id ?? null;
}

async function resolvePlatoonId(tx: DbExecutor, platoonKey: string): Promise<string | null> {
  const normalized = platoonKey.trim().toUpperCase();
  const [platoon] = await tx
    .select({ id: platoons.id })
    .from(platoons)
    .where(and(eq(platoons.key, normalized), isNull(platoons.deletedAt)))
    .limit(1);
  return platoon?.id ?? null;
}

async function upsertAssignment(
  tx: DbExecutor,
  ctx: ApplyContext,
  assignment: AppointmentAssignmentTemplate,
  positionIdByKey: Map<string, string>
): Promise<void> {
  const normalizedPositionKey = assignment.positionKey.trim().toUpperCase();
  const positionId = positionIdByKey.get(normalizedPositionKey);
  if (!positionId) {
    ctx.warnings.push(
      `Skipped assignment for "${assignment.username}" because position "${normalizedPositionKey}" was not resolved.`
    );
    markSkipped(ctx.stats.assignments);
    return;
  }

  const userId = await resolveUserId(tx, assignment.username);
  if (!userId) {
    ctx.warnings.push(`Skipped assignment for "${assignment.username}" because user does not exist.`);
    markSkipped(ctx.stats.assignments);
    return;
  }

  let scopeId: string | null = null;
  if (assignment.scopeType === "PLATOON") {
    if (!assignment.platoonKey?.trim()) {
      ctx.warnings.push(
        `Skipped assignment for "${assignment.username}" because platoon key is required for PLATOON scope.`
      );
      markSkipped(ctx.stats.assignments);
      return;
    }
    scopeId = await resolvePlatoonId(tx, assignment.platoonKey);
    if (!scopeId) {
      ctx.warnings.push(
        `Skipped assignment for "${assignment.username}" because platoon "${assignment.platoonKey}" does not exist.`
      );
      markSkipped(ctx.stats.assignments);
      return;
    }
  }

  const [existingSlot] = await tx
    .select({
      id: appointments.id,
      userId: appointments.userId,
      scopeType: appointments.scopeType,
      scopeId: appointments.scopeId,
      startsAt: appointments.startsAt,
      reason: appointments.reason,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.positionId, positionId),
        eq(appointments.scopeType, assignment.scopeType),
        assignment.scopeType === "PLATOON" && scopeId
          ? eq(appointments.scopeId, scopeId)
          : sql`${appointments.scopeId} IS NULL`,
        eq(appointments.assignment, "PRIMARY"),
        isNull(appointments.deletedAt),
        sql`(${appointments.endsAt} IS NULL OR ${appointments.endsAt} >= ${ctx.now})`
      )
    )
    .orderBy(asc(appointments.startsAt))
    .limit(1);

  if (!existingSlot) {
    await tx.insert(appointments).values({
      userId,
      positionId,
      assignment: "PRIMARY",
      scopeType: assignment.scopeType,
      scopeId: assignment.scopeType === "PLATOON" ? scopeId : null,
      startsAt: ctx.now,
      endsAt: null,
      appointedBy: ctx.actorUserId ?? null,
      reason: TEMPLATE_REASON,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    });
    markCreated(ctx.stats.assignments);
    return;
  }

  const patch = {
    userId,
    scopeType: assignment.scopeType,
    scopeId: assignment.scopeType === "PLATOON" ? scopeId : null,
    reason: TEMPLATE_REASON,
  };

  if (!needsChange(existingSlot, patch)) {
    markSkipped(ctx.stats.assignments);
    return;
  }

  await tx
    .update(appointments)
    .set({
      ...patch,
      updatedAt: ctx.now,
    })
    .where(eq(appointments.id, existingSlot.id));
  markUpdated(ctx.stats.assignments);
}

export async function applyAppointmentTemplateProfile(
  input: ApplyAppointmentTemplateProfileInput = {}
): Promise<AppointmentTemplateApplyResult> {
  const profile = input.profile ?? DEFAULT_PROFILE;
  const dryRun = input.dryRun ?? false;
  const pack = selectPack(profile);

  const ctx: ApplyContext = {
    now: new Date(),
    dryRun,
    actorUserId: input.actorUserId,
    warnings: [],
    stats: createStats(),
  };

  try {
    await db.transaction(async (tx) => {
      const positionIdByKey = new Map<string, string>();
      for (const templatePosition of pack.positions) {
        const positionId = await upsertPosition(tx, ctx, templatePosition);
        positionIdByKey.set(templatePosition.key.trim().toUpperCase(), positionId);
      }

      for (const assignment of pack.assignments) {
        await upsertAssignment(tx, ctx, assignment, positionIdByKey);
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

