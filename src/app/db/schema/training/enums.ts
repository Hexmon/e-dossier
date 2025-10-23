import { pgEnum } from 'drizzle-orm/pg-core';

export const branchKind = pgEnum('branch_kind', ['O', 'E', 'M']);               // null = common (Sem 1–2)
export const delegationKind = pgEnum('delegation_kind',
    ['MEDICAL', 'DISCIPLINARY', 'ACADEMIC', 'ADMIN', 'OTHER']
);
export const ssbPointKind = pgEnum('ssb_point_kind', ['POSITIVE', 'NEGATIVE']);
export const commModeKind = pgEnum('comm_mode_kind', ['LETTER', 'PHONE', 'EMAIL', 'IN_PERSON', 'OTHER']);
export const ocStatusKind = pgEnum('oc_status_kind', ['ACTIVE', 'DELEGATED', 'WITHDRAWN', 'PASSED_OUT']);
