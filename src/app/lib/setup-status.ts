import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/app/db/client";
import { appointments } from "@/app/db/schema/auth/appointments";
import { orgHierarchyNodes } from "@/app/db/schema/auth/orgHierarchyNodes";
import { platoons } from "@/app/db/schema/auth/platoons";
import { positions } from "@/app/db/schema/auth/positions";
import { users } from "@/app/db/schema/auth/users";
import { courseOfferings } from "@/app/db/schema/training/courseOfferings";
import { courses } from "@/app/db/schema/training/courses";
import { ocCadets } from "@/app/db/schema/training/oc";

export type SetupStepKey =
  | "superAdmin"
  | "platoons"
  | "hierarchy"
  | "courses"
  | "offerings"
  | "ocs";

export type SetupStepStatus = "complete" | "pending" | "blocked";

export type SetupStatusCounts = {
  activeSuperAdmins: number;
  activePlatoons: number;
  activeCourses: number;
  activeOfferings: number;
  activeOCs: number;
  activeHierarchyNodes: number;
  activeRootNodes: number;
  missingPlatoonHierarchyNodes: number;
};

export type SetupStatus = {
  bootstrapRequired: boolean;
  setupComplete: boolean;
  nextStep: SetupStepKey | null;
  counts: SetupStatusCounts;
  steps: Record<
    SetupStepKey,
    {
      status: SetupStepStatus;
      complete: boolean;
    }
  >;
};

function resolveStepStatus(params: {
  complete: boolean;
  prerequisitesMet: boolean;
}): SetupStepStatus {
  if (params.complete) {
    return "complete";
  }

  if (!params.prerequisitesMet) {
    return "blocked";
  }

  return "pending";
}

export function deriveSetupStatus(counts: SetupStatusCounts): SetupStatus {
  const superAdminComplete = counts.activeSuperAdmins > 0;
  const platoonsComplete = counts.activePlatoons > 0;
  const hierarchyCoverageComplete =
    counts.activeRootNodes === 1 && counts.missingPlatoonHierarchyNodes === 0;
  const hierarchyComplete = platoonsComplete && hierarchyCoverageComplete;
  const coursesComplete = counts.activeCourses > 0;
  const offeringsComplete = counts.activeOfferings > 0;
  const ocsComplete = counts.activeOCs > 0;

  const steps: SetupStatus["steps"] = {
    superAdmin: {
      status: resolveStepStatus({
        complete: superAdminComplete,
        prerequisitesMet: true,
      }),
      complete: superAdminComplete,
    },
    platoons: {
      status: resolveStepStatus({
        complete: platoonsComplete,
        prerequisitesMet: superAdminComplete,
      }),
      complete: platoonsComplete,
    },
    hierarchy: {
      status: resolveStepStatus({
        complete: hierarchyComplete,
        prerequisitesMet: superAdminComplete && platoonsComplete,
      }),
      complete: hierarchyComplete,
    },
    courses: {
      status: resolveStepStatus({
        complete: coursesComplete,
        prerequisitesMet: superAdminComplete && platoonsComplete && hierarchyComplete,
      }),
      complete: coursesComplete,
    },
    offerings: {
      status: resolveStepStatus({
        complete: offeringsComplete,
        prerequisitesMet:
          superAdminComplete && platoonsComplete && hierarchyComplete && coursesComplete,
      }),
      complete: offeringsComplete,
    },
    ocs: {
      status: resolveStepStatus({
        complete: ocsComplete,
        prerequisitesMet:
          superAdminComplete &&
          platoonsComplete &&
          hierarchyComplete &&
          coursesComplete &&
          offeringsComplete,
      }),
      complete: ocsComplete,
    },
  };

  const nextStep =
    (Object.entries(steps).find(([, step]) => !step.complete)?.[0] as SetupStepKey | undefined) ??
    null;

  return {
    bootstrapRequired: !superAdminComplete,
    setupComplete: Object.values(steps).every((step) => step.complete),
    nextStep,
    counts,
    steps,
  };
}

async function readCount(query: Promise<Array<{ count: number }>>): Promise<number> {
  const rows = await query;
  return Number(rows[0]?.count ?? 0);
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const [
    activeSuperAdmins,
    activePlatoons,
    activeCourses,
    activeOfferings,
    activeOCs,
    activeHierarchyNodes,
    activeRootNodes,
    activePlatoonRows,
    activePlatoonNodeRows,
  ] = await Promise.all([
    readCount(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(appointments)
        .innerJoin(users, eq(users.id, appointments.userId))
        .innerJoin(positions, eq(positions.id, appointments.positionId))
        .where(
          and(
            eq(positions.key, "SUPER_ADMIN"),
            eq(users.isActive, true),
            isNull(users.deletedAt),
            isNull(appointments.deletedAt),
            isNull(appointments.endsAt)
          )
        )
    ),
    readCount(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(platoons)
        .where(isNull(platoons.deletedAt))
    ),
    readCount(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(courses)
        .where(isNull(courses.deletedAt))
    ),
    readCount(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(courseOfferings)
        .where(isNull(courseOfferings.deletedAt))
    ),
    readCount(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(ocCadets)
        .where(isNull(ocCadets.deletedAt))
    ),
    readCount(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orgHierarchyNodes)
        .where(isNull(orgHierarchyNodes.deletedAt))
    ),
    readCount(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orgHierarchyNodes)
        .where(
          and(eq(orgHierarchyNodes.nodeType, "ROOT"), isNull(orgHierarchyNodes.deletedAt))
        )
    ),
    db
      .select({ id: platoons.id })
      .from(platoons)
      .where(isNull(platoons.deletedAt)),
    db
      .select({ platoonId: orgHierarchyNodes.platoonId })
      .from(orgHierarchyNodes)
      .where(
        and(eq(orgHierarchyNodes.nodeType, "PLATOON"), isNull(orgHierarchyNodes.deletedAt))
      ),
  ]);

  const activePlatoonIds = new Set(activePlatoonRows.map((row) => row.id));
  const hierarchyPlatoonIds = new Set(
    activePlatoonNodeRows
      .map((row) => row.platoonId)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  );

  let missingPlatoonHierarchyNodes = 0;
  for (const platoonId of activePlatoonIds) {
    if (!hierarchyPlatoonIds.has(platoonId)) {
      missingPlatoonHierarchyNodes += 1;
    }
  }

  return deriveSetupStatus({
    activeSuperAdmins,
    activePlatoons,
    activeCourses,
    activeOfferings,
    activeOCs,
    activeHierarchyNodes,
    activeRootNodes,
    missingPlatoonHierarchyNodes,
  });
}
