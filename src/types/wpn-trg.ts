export interface Row {
    subject: string;
    maxMarks: number;
    obtained: string;
}

export interface TermData {
    records: Row[];
    achievements: { value: string }[];
}

export const termPrefill: Row[] = [
    { subject: "Written", maxMarks: 40, obtained: "" },
    { subject: "5.56 MM INSAS Firing", maxMarks: 40, obtained: "" },
    { subject: "5.56 MM INSAS LMG Firing", maxMarks: 40, obtained: "" },
];