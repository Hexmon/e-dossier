// Form data structure (used in DisciplineForm component)
export interface DisciplineRow {
    id?: string;
    serialNo: string;
    dateOfOffence: string;
    offence: string;
    punishmentAwarded: string;
    punishmentId?: string;
    numberOfPunishments?: string | number;
    dateOfAward: string;
    awardedOn?: string;
    byWhomAwarded: string;
    awardedBy?: string;
    negativePts: string;
    cumulative: string;
    pointsDelta?: number;
    semester?: number;
}

export interface DisciplineForm {
    records: DisciplineRow[];
}

// API response structure (returned from getDisciplineRecords)
export interface DisciplineResponse {
    id: string;
    semester?: number;
    dateOfOffence?: string;
    offence?: string;
    punishmentAwarded?: string;
    punishmentId?: string;
    numberOfPunishments?: number;
    awardedOn?: string;
    awardedBy?: string;
    pointsDelta?: number;
    pointsCumulative?: number;
}