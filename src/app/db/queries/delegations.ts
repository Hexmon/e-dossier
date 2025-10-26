// src/app/db/queries/delegations.ts
import { db } from '../client';
import { delegations } from '../schema/auth/delegations';
import { positions } from '../schema/auth/positions';
import { and, eq, isNull, lte, gte, or } from 'drizzle-orm';
import { ApiError } from '@/app/lib/http';

type PositionKey =
  | 'COMMANDANT'
  | 'DEPUTY_COMMANDANT'
  | 'HOAT'
  | 'DEPUTY_SECRETARY'
  | 'PLATOON_COMMANDER';

type ScopeType = 'GLOBAL' | 'PLATOON';

export async function grantDelegation(params: {
  grantorUserId: string;
  granteeUserId: string;
  actAsPosition: PositionKey;          // position KEY, not id
  scopeType?: ScopeType;
  scopeId?: string;
  startsAt: Date;
  endsAt?: Date | null;
  reason?: string;
}) {
  // 1) Resolve position key -> id
  const [pos] = await db
    .select({ id: positions.id })
    .from(positions)
    .where(eq(positions.key, params.actAsPosition))
    .limit(1);

  if (!pos) {
    throw new ApiError(400, 'Invalid actAsPosition', 'bad_request', {
      actAsPosition: params.actAsPosition,
    });
  }

  // 2) Scope defaults & validation
  const scopeType: ScopeType = params.scopeType ?? 'GLOBAL';
  const scopeId = scopeType === 'PLATOON' ? params.scopeId ?? null : null;
  if (scopeType === 'PLATOON' && !scopeId) {
    throw new ApiError(400, 'scopeId required for PLATOON scope', 'bad_request');
  }

  // 3) Insert using actAsPositionId (matches your schema)
  const [row] = await db
    .insert(delegations)
    .values({
      grantorUserId: params.grantorUserId,
      granteeUserId: params.granteeUserId,
      actAsPositionId: pos.id,                // ✅ not actAsPosition
      scopeType,
      scopeId,
      startsAt: params.startsAt,
      endsAt: params.endsAt ?? null,
      reason: params.reason ?? null,
    })
    .returning();

  return row;
}

export async function activeDelegationsFor(userId: string, at: Date = new Date()) {
  // If you do NOT have a tstzrange column "valid_during", use the standard window:
  return db
    .select()
    .from(delegations)
    .where(
      and(
        eq(delegations.granteeUserId, userId),
        isNull(delegations.deletedAt),
        lte(delegations.startsAt, at),
        or(isNull(delegations.endsAt), gte(delegations.endsAt, at))
      )
    );
}
