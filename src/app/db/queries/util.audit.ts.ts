import { db } from '../client';
import { CreateAuditLogParams, createAuditLog } from '@/lib/audit-log';

type TransactionFn = Parameters<typeof db.transaction>[0];
type Tx = TransactionFn extends (tx: infer Client, ...args: any[]) => any ? Client : never;
type TxClient = typeof db | Tx;

export async function auditLog(tx: TxClient, input: CreateAuditLogParams) {
    await createAuditLog({
        ...input,
        client: tx,
        finalizeAccessLog: false,
    });
}
