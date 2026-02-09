export const SUBJECT_KEYS = [
    'academics',
    'olq',
    'pt_swimming',
    'games',
    'drill',
    'camp',
    'cfe',
    'cdr_marks',
    'total',
] as const;

export type SubjectKey = (typeof SUBJECT_KEYS)[number];

export const SUBJECT_LABELS: Record<SubjectKey, string> = {
    academics: 'Academics (incl Service Sub)',
    olq: 'OLQ',
    pt_swimming: 'PT & Swimming',
    games: 'Games (incl X-Country)',
    drill: 'Drill',
    camp: 'Camp',
    cfe: 'CFE',
    cdr_marks: "Cdr's Marks",
    total: 'TOTAL',
};

export const CDR_MAX_MARKS_PER_SEMESTER = 25;

export const SPR_MAX_MARKS: Record<number, Record<SubjectKey, number>> = {
    1: { academics: 1350, olq: 300, pt_swimming: 150, games: 100, drill: 0, camp: 0, cfe: 25, cdr_marks: 25, total: 1950 },
    2: { academics: 1350, olq: 300, pt_swimming: 150, games: 100, drill: 0, camp: 0, cfe: 25, cdr_marks: 25, total: 1950 },
    3: { academics: 1350, olq: 300, pt_swimming: 150, games: 100, drill: 0, camp: 0, cfe: 25, cdr_marks: 25, total: 1950 },
    4: { academics: 1350, olq: 300, pt_swimming: 150, games: 100, drill: 25, camp: 0, cfe: 25, cdr_marks: 25, total: 1975 },
    5: { academics: 1350, olq: 300, pt_swimming: 150, games: 100, drill: 25, camp: 100, cfe: 25, cdr_marks: 25, total: 2075 },
    6: { academics: 1350, olq: 300, pt_swimming: 150, games: 100, drill: 40, camp: 110, cfe: 25, cdr_marks: 25, total: 2100 },
};

export const FPR_MAX_MARKS: Record<SubjectKey, number> = {
    academics: 8100,
    olq: 1800,
    pt_swimming: 900,
    games: 600,
    drill: 90,
    camp: 210,
    cfe: 150,
    cdr_marks: 150,
    total: 12000,
};

export type PerformanceRow = {
    subjectKey: SubjectKey;
    subjectLabel: string;
    maxMarks: number;
    marksScored: number;
    remarks: string;
};

export type PerformanceReportRemarks = {
    platoonCommanderRemarks: string;
    deputyCommanderRemarks: string;
    commanderRemarks: string;
};

export const PERFORMANCE_REPORT_DEFAULTS: PerformanceReportRemarks = {
    platoonCommanderRemarks: '',
    deputyCommanderRemarks: '',
    commanderRemarks: '',
};
