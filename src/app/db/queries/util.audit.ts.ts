import { InferInsertModel } from 'drizzle-orm';
import { auditLogs } from '../schema/auth/audit';
import { db } from '../client';

type AuditInput = Omit<InferInsertModel<typeof auditLogs>, 'id' | 'createdAt'>;

export async function auditLog(
    tx: typeof db | any, // allow transaction or db
    input: AuditInput
) {
    await tx.insert(auditLogs).values({
        actorUserId: input.actorUserId ?? null,
        eventType: input.eventType,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        description: input.description ?? null,
        metadata: input.metadata ?? null,
        ipAddr: input.ipAddr ?? null,
        userAgent: input.userAgent ?? null,
    });
}
