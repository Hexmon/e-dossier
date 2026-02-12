import { z } from 'zod';
import { Semester } from '@/app/lib/oc-validators';
import { SUBJECT_KEYS } from '@/app/services/performance-record.constants';

const subjectKeySchema = z.enum(SUBJECT_KEYS);

export const sprQuerySchema = z.object({ semester: Semester });

export const performanceReportRemarksSchema = z.object({
    platoonCommanderRemarks: z.string().max(4000).optional(),
    deputyCommanderRemarks: z.string().max(4000).optional(),
    commanderRemarks: z.string().max(4000).optional(),
}).optional();

const subjectRemarksArraySchema = z.array(
    z.object({
        subjectKey: subjectKeySchema,
        remarks: z.string(),
    }),
);

// Accept legacy/free-form remark keys from older clients; service safely maps known keys.
const subjectRemarksMapSchema = z.record(z.string(), z.string());

export const sprUpsertSchema = z.object({
    cdrMarks: z.coerce.number().min(0).max(25).optional(),
    subjectRemarks: z.union([subjectRemarksArraySchema, subjectRemarksMapSchema]).optional(),
    performanceReportRemarks: performanceReportRemarksSchema,
}).strict();

export function normalizeSubjectRemarks(
    input: z.infer<typeof sprUpsertSchema>['subjectRemarks'],
): Record<string, string> | undefined {
    if (!input) return undefined;
    if (Array.isArray(input)) {
        return input.reduce<Record<string, string>>((acc, item) => {
            acc[item.subjectKey] = item.remarks ?? '';
            return acc;
        }, {});
    }
    return input;
}
