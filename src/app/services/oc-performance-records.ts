import { ApiError } from '@/app/lib/http';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { convertSubjectMarks } from './performance-record.conversion';
import {
    CDR_MAX_MARKS_PER_SEMESTER,
    FPR_MAX_MARKS,
    PERFORMANCE_REPORT_DEFAULTS,
    SPR_MAX_MARKS,
    SUBJECT_KEYS,
    SUBJECT_LABELS,
    type PerformanceReportRemarks,
    type PerformanceRow,
    type SubjectKey,
} from './performance-record.constants';
import {
    getSemesterSourceScores,
    getSprRecord,
    upsertSprRecord,
    getAllSemesterSourceMarks,
} from '@/app/db/queries/performance-records';

type AuditCtx = { actorUserId?: string | null; request?: Request };

function safeRemarks(map: Record<string, string> | null | undefined, key: SubjectKey) {
    return (map?.[key] ?? '').toString();
}

function buildSprRows(
    semester: number,
    source: Awaited<ReturnType<typeof getSemesterSourceScores>>,
    cdrMarks: number,
    remarks: Record<string, string>,
): PerformanceRow[] {
    const maxMap = SPR_MAX_MARKS[semester];
    const rows: PerformanceRow[] = [];

    const push = (key: SubjectKey, scored: number) => {
        rows.push({
            subjectKey: key,
            subjectLabel: SUBJECT_LABELS[key],
            maxMarks: maxMap[key],
            marksScored: convertSubjectMarks({
                semester,
                subjectKey: key,
                rawScored: scored,
                rawMax: maxMap[key],
                targetMax: maxMap[key],
            }),
            remarks: safeRemarks(remarks, key),
        });
    };

    push('academics', source.academics);
    push('olq', source.olq);
    push('pt_swimming', source.ptSwimming);
    push('games', source.games);
    push('drill', source.drill);
    push('camp', source.camp);
    push('cfe', source.cfe);

    rows.push({
        subjectKey: 'cdr_marks',
        subjectLabel: SUBJECT_LABELS.cdr_marks,
        maxMarks: maxMap.cdr_marks,
        marksScored: Math.max(0, Math.min(maxMap.cdr_marks, cdrMarks)),
        remarks: safeRemarks(remarks, 'cdr_marks'),
    });

    const total = rows.reduce((acc, r) => acc + (r.subjectKey === 'total' ? 0 : r.marksScored), 0);
    rows.push({
        subjectKey: 'total',
        subjectLabel: SUBJECT_LABELS.total,
        maxMarks: maxMap.total,
        marksScored: total,
        remarks: safeRemarks(remarks, 'total'),
    });

    return rows;
}

export async function getSprView(ocId: string, semester: number) {
    if (semester < 1 || semester > 6) {
        throw new ApiError(400, 'semester must be between 1 and 6', 'bad_request');
    }

    const [source, persisted] = await Promise.all([
        getSemesterSourceScores(ocId, semester),
        getSprRecord(ocId, semester),
    ]);

    const subjectRemarks = (persisted?.subjectRemarks as Record<string, string> | undefined) ?? {};
    const rows = buildSprRows(semester, source, Number(persisted?.cdrMarks ?? 0), subjectRemarks);

    return {
        semester,
        rows,
        performanceReportRemarks: {
            platoonCommanderRemarks: persisted?.platoonCommanderRemarks ?? PERFORMANCE_REPORT_DEFAULTS.platoonCommanderRemarks,
            deputyCommanderRemarks: persisted?.deputyCommanderRemarks ?? PERFORMANCE_REPORT_DEFAULTS.deputyCommanderRemarks,
            commanderRemarks: persisted?.commanderRemarks ?? PERFORMANCE_REPORT_DEFAULTS.commanderRemarks,
        },
    };
}

export async function upsertSprView(
    ocId: string,
    semester: number,
    dto: {
        cdrMarks?: number;
        subjectRemarks?: Record<string, string>;
        performanceReportRemarks?: Partial<PerformanceReportRemarks>;
    },
    auditCtx?: AuditCtx,
) {
    if (dto.cdrMarks !== undefined && (dto.cdrMarks < 0 || dto.cdrMarks > CDR_MAX_MARKS_PER_SEMESTER)) {
        throw new ApiError(400, `cdrMarks must be between 0 and ${CDR_MAX_MARKS_PER_SEMESTER}`, 'bad_request');
    }

    const existing = await getSprRecord(ocId, semester);
    await upsertSprRecord(ocId, semester, {
        cdrMarks: dto.cdrMarks,
        subjectRemarks: dto.subjectRemarks ?? (existing?.subjectRemarks as Record<string, string> | undefined),
        platoonCommanderRemarks: dto.performanceReportRemarks?.platoonCommanderRemarks,
        deputyCommanderRemarks: dto.performanceReportRemarks?.deputyCommanderRemarks,
        commanderRemarks: dto.performanceReportRemarks?.commanderRemarks,
    });

    await createAuditLog({
        actorUserId: auditCtx?.actorUserId ?? null,
        eventType: AuditEventType.OC_RECORD_UPDATED,
        resourceType: AuditResourceType.OC,
        resourceId: ocId,
        description: `Updated SPR for OC ${ocId} semester ${semester}`,
        metadata: { module: 'spr', semester },
        request: auditCtx?.request,
    });

    return getSprView(ocId, semester);
}

export async function getFprView(ocId: string) {
    const semesters = [1, 2, 3, 4, 5, 6];
    const [all, sprRecords] = await Promise.all([
        getAllSemesterSourceMarks(ocId),
        Promise.all(semesters.map((sem) => getSprRecord(ocId, sem))),
    ]);

    const rows = (SUBJECT_KEYS.filter((k) => k !== 'total') as SubjectKey[]).map((key) => {
        const marksBySemester = semesters.map((s, idx) => {
            if (key === 'cdr_marks') return Number(sprRecords[idx]?.cdrMarks ?? 0);
            const src = all[s as keyof typeof all];
            return key === 'academics' ? src.academics
                : key === 'olq' ? src.olq
                : key === 'pt_swimming' ? src.ptSwimming
                : key === 'games' ? src.games
                : key === 'drill' ? src.drill
                : key === 'camp' ? src.camp
                : src.cfe;
        });

        const total = marksBySemester.reduce((acc, v) => acc + Number(v ?? 0), 0);
        return {
            subjectKey: key,
            subjectLabel: key === 'cdr_marks' ? SUBJECT_LABELS.cdr_marks : SUBJECT_LABELS[key],
            maxMarks: FPR_MAX_MARKS[key],
            marksBySemester,
            marksScored: total,
        };
    });

    const grandTotal = rows.reduce((acc, r) => acc + r.marksScored, 0);
    rows.push({
        subjectKey: 'total',
        subjectLabel: 'GRAND TOTAL',
        maxMarks: FPR_MAX_MARKS.total,
        marksBySemester: [],
        marksScored: grandTotal,
    });

    return { rows };
}
