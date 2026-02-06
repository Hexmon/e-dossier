import type { SubjectKey } from './performance-record.constants';

export type ConvertInput = {
    semester: number;
    subjectKey: SubjectKey;
    rawScored: number;
    rawMax: number;
    targetMax: number;
};

function trunc1(n: number) {
    return Math.trunc((n + Number.EPSILON) * 10) / 10;
}

// TODO: replace per-subject formulas once provided.
export function convertSubjectMarks(input: ConvertInput): number {
    const { subjectKey, rawScored, rawMax, targetMax } = input;
    if (targetMax <= 0) return 0;

    if (subjectKey === 'cfe') {
        const capped = Math.min(Math.max(rawScored, 0), 50);
        return trunc1((capped / 50) * targetMax);
    }

    if (rawMax <= 0) return 0;
    const scaled = (rawScored / rawMax) * targetMax;
    return trunc1(Math.max(0, Math.min(targetMax, scaled)));
}
