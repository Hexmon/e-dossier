// src/app/db/queries/delegations.ts
import { db } from '../client';
import { delegations } from '../schema/auth/delegations';
import { and, eq, isNull, sql } from 'drizzle-orm';

export async function grantDelegation(params: {
  grantorUserId: string; granteeUserId: string;
  actAsPosition: 'COMMANDANT'|'DEPUTY_COMMANDANT'|'HOAT'|'DEPUTY_SECRETARY'|'PLATOON_COMMANDER';
  scopeType?: 'GLOBAL'|'PLATOON';
  scopeId?: string;
  startsAt: Date; endsAt?: Date|null; reason?: string;
}) {
  return db.insert(delegations).values({
    grantorUserId: params.grantorUserId,
    granteeUserId: params.granteeUserId,
    actAsPosition: params.actAsPosition,
    scopeType: params.scopeType ?? 'GLOBAL',   // FIX: default GLOBAL, not null
    scopeId: params.scopeId ?? null,
    startsAt: params.startsAt,
    endsAt: params.endsAt ?? null,
    reason: params.reason ?? null,
  }).returning();
}

export async function activeDelegationsFor(userId: string) {
  return db.select().from(delegations).where(and(
    eq(delegations.granteeUserId, userId),
    isNull(delegations.deletedAt),
    sql`delegations.valid_during @> now()`   // created via SQL migration
  ));
}
