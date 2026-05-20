import 'dotenv/config';

import { eq } from 'drizzle-orm';
import { db } from '../src/app/db/client';
import { courses } from '../src/app/db/schema/training/courses';
import {
  ocPreCommission,
  ocReconciliationAudit,
  ocSemesterMarks,
} from '../src/app/db/schema/training/oc';
import { platoons } from '../src/app/db/schema/auth/platoons';
import {
  createOcWithLifecycle,
  syncOcLifecycleFromCadet,
} from '../src/app/db/queries/oc-lifecycle';

class RollbackComplete extends Error {
  constructor() {
    super('transactional OC zero-loss smoke completed and rolled back');
  }
}

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .limit(1);

  if (!course) {
    throw new Error('No course exists. Seed or create one course before running the OC DB integration smoke.');
  }

  const [platoon] = await db
    .select({ id: platoons.id })
    .from(platoons)
    .limit(1);

  const marker = `ZL-TXN-${Date.now()}`;

  try {
    await db.transaction(async (tx) => {
      const { oc, enrollment } = await createOcWithLifecycle({
        name: `${marker} OC`,
        ocNo: marker,
        uid: `${marker}-UID`,
        courseId: course.id,
        branch: 'O',
        platoonId: platoon?.id ?? null,
        arrivalAtUniversity: new Date(),
        actorUserId: null,
      }, tx);

      const [snapshot] = await tx
        .select()
        .from(ocPreCommission)
        .where(eq(ocPreCommission.ocId, oc.id))
        .limit(1);

      if (!snapshot) fail('OC creation did not create a pre-commission compatibility snapshot.');
      if (snapshot.courseId !== course.id) fail('Pre-commission snapshot course did not match canonical OC course.');
      if (enrollment.status !== 'ACTIVE') fail('OC creation did not create an active baseline enrollment.');

      await tx
        .update(ocPreCommission)
        .set({ branch: 'E' })
        .where(eq(ocPreCommission.ocId, oc.id));

      await syncOcLifecycleFromCadet(oc.id, {
        reason: 'transactional_zero_loss_integration_smoke',
      }, tx);

      const [repairedSnapshot] = await tx
        .select()
        .from(ocPreCommission)
        .where(eq(ocPreCommission.ocId, oc.id))
        .limit(1);

      if (repairedSnapshot?.branch !== 'O') {
        fail('Lifecycle sync did not repair pre-commission branch from canonical OC data.');
      }

      const [auditRow] = await tx
        .select()
        .from(ocReconciliationAudit)
        .where(eq(ocReconciliationAudit.ocId, oc.id))
        .limit(1);

      if (!auditRow) fail('Lifecycle conflict repair did not preserve the prior value in reconciliation audit.');

      const [marks] = await tx
        .insert(ocSemesterMarks)
        .values({
          ocId: oc.id,
          enrollmentId: enrollment.id,
          semester: 1,
          branchTag: 'O',
          subjects: [],
        })
        .returning();

      const [reachableMarks] = await tx
        .select()
        .from(ocSemesterMarks)
        .where(eq(ocSemesterMarks.id, marks.id))
        .limit(1);

      if (reachableMarks?.enrollmentId !== enrollment.id) {
        fail('Enrollment-linked child dossier record was not reachable after lifecycle sync.');
      }

      throw new RollbackComplete();
    });
  } catch (error) {
    if (error instanceof RollbackComplete) {
      console.log(error.message);
      console.log('Verified: OC create, baseline enrollment, compatibility snapshot, conflict audit, and child record reachability.');
      return;
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
