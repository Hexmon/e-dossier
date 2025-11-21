export type DetentionRow = {
    id: string;
    serialNo?: string;
    term: string;
    reason: string;
    fromDate: string;
    toDate: string;
    remarks: string;
};

export type DetentionFormRow = {
    reason: string;
    fromDate: string;
    toDate: string;
    remarks: string;
};

export type DetentionFormData = {
    records: DetentionFormRow[];
};