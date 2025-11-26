export interface Row {
    obstacle: string;
    id?: string;
    obtained: string;
    remark: string;
}

export interface TermData {
    records: Row[];
}