export interface Row {
    id?: string;
    test: string;
    timing10Label: string;
    distance10: string;
    timing20Label: string;
    distance20: string;
    timing30Label: string;
    distance30: string;
    marks: string;
    remark: string;
}

export interface TermData {
    records: Row[];
}