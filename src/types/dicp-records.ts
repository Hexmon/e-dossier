export interface DisciplineRow {
    id?: string;
    serialNo: string;
    dateOfOffence: string;
    offence: string;
    punishmentAwarded: string;
    dateOfAward: string;
    awardedOn?: string;
    byWhomAwarded: string;
    awardedBy?: string;
    negativePts: string;
    cumulative: string;
    pointsDelta?: number;
}

export interface DisciplineForm {
    records: DisciplineRow[];
}