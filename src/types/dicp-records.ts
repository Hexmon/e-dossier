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
    awardedOn: string;
    awardedBy: string;
    pointsDelta: number;
}

export interface DisciplineForm {
    records: DisciplineRow[];
}