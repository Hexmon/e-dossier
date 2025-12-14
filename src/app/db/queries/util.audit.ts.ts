import { db } from '../client';
import { CreateAuditLogParams, createAuditLog } from '@/lib/audit-log';

type TxClient = typeof db | Parameters<typeof db.transaction>[0];

export async function auditLog(tx: TxClient, input: CreateAuditLogParams) {
    await createAuditLog({
        ...input,
        client: tx,
        finalizeAccessLog: false,
    });
}
