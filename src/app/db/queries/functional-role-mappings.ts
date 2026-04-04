import { eq } from "drizzle-orm";

import { db } from "@/app/db/client";
import { functionalRoleMappings } from "@/app/db/schema/auth/functionalRoleMappings";
import { positions } from "@/app/db/schema/auth/positions";
import { COMMANDER_EQUIVALENT_CAPABILITY } from "@/lib/functional-role-capabilities";
export type FunctionalRoleCapability = typeof COMMANDER_EQUIVALENT_CAPABILITY;

export type CommanderEquivalentMapping = {
  id: string;
  capabilityKey: FunctionalRoleCapability;
  positionId: string | null;
  positionKey: string | null;
  positionName: string | null;
  defaultScope: string | null;
  updatedBy: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  source: "mapping" | "legacy_fallback";
};

const COMMANDER_MAPPING_SELECT = {
  id: functionalRoleMappings.id,
  capabilityKey: functionalRoleMappings.capabilityKey,
  positionId: functionalRoleMappings.positionId,
  positionKey: positions.key,
  positionName: positions.displayName,
  defaultScope: positions.defaultScope,
  updatedBy: functionalRoleMappings.updatedBy,
  createdAt: functionalRoleMappings.createdAt,
  updatedAt: functionalRoleMappings.updatedAt,
} as const;

export async function getCommanderEquivalentMapping(): Promise<CommanderEquivalentMapping | null> {
  const [mapping] = await db
    .select(COMMANDER_MAPPING_SELECT)
    .from(functionalRoleMappings)
    .leftJoin(positions, eq(positions.id, functionalRoleMappings.positionId))
    .where(eq(functionalRoleMappings.capabilityKey, COMMANDER_EQUIVALENT_CAPABILITY))
    .limit(1);

  if (mapping) {
    return {
      ...mapping,
      capabilityKey: COMMANDER_EQUIVALENT_CAPABILITY,
      source: "mapping",
    };
  }

  return null;
}

export async function resolveCommanderEquivalentMapping(): Promise<CommanderEquivalentMapping | null> {
  const configured = await getCommanderEquivalentMapping();
  if (configured?.positionId) {
    return configured;
  }

  const [legacyPosition] = await db
    .select({
      id: positions.id,
      key: positions.key,
      displayName: positions.displayName,
      defaultScope: positions.defaultScope,
    })
    .from(positions)
    .where(eq(positions.key, "PLATOON_COMMANDER"))
    .limit(1);

  if (!legacyPosition) {
    return configured;
  }

  if (configured) {
    return {
      ...configured,
      positionId: legacyPosition.id,
      positionKey: legacyPosition.key,
      positionName: legacyPosition.displayName,
      defaultScope: legacyPosition.defaultScope,
      source: "legacy_fallback",
    };
  }

  return {
    id: "",
    capabilityKey: COMMANDER_EQUIVALENT_CAPABILITY,
    positionId: legacyPosition.id,
    positionKey: legacyPosition.key,
    positionName: legacyPosition.displayName,
    defaultScope: legacyPosition.defaultScope,
    updatedBy: null,
    createdAt: null,
    updatedAt: null,
    source: "legacy_fallback",
  };
}

export async function updateCommanderEquivalentMapping(positionId: string | null, actorUserId: string) {
  const [current] = await db
    .select()
    .from(functionalRoleMappings)
    .where(eq(functionalRoleMappings.capabilityKey, COMMANDER_EQUIVALENT_CAPABILITY))
    .limit(1);

  if (!current) {
    const [created] = await db
      .insert(functionalRoleMappings)
      .values({
        capabilityKey: COMMANDER_EQUIVALENT_CAPABILITY,
        positionId,
        updatedBy: actorUserId,
      })
      .returning();

    return { before: null, after: created };
  }

  const [updated] = await db
    .update(functionalRoleMappings)
    .set({
      positionId,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(functionalRoleMappings.id, current.id))
    .returning();

  return { before: current, after: updated };
}
