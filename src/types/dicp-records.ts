export interface DisciplineRow {
    id?: string;
    serialNo: string;
    dateOfOffence: string;
    offence: string;
    punishmentAwarded: string;
    dateOfAward: string;
    byWhomAwarded: string;
    negativePts: string;
    cumulative: string;
}

export interface DisciplineForm {
    records: DisciplineRow[];
}