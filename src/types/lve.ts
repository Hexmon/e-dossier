export type LveRow = {
    id: string;
    serialNo?: string;
    term: string;
    lveDetails: string;
    fromDate: string;
    toDate: string;
    remarks: string;
};

export type LveFormRow = {
    lveDetails: string;
    fromDate: string;
    toDate: string;
    remarks: string;
};

export type LveFormData = {
    records: LveFormRow[];
};