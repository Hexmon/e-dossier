/** Local types for this page */
export type HkeRow = {
    id?: string;
    serialNo?: string;
    term: string;
    hike: string;
    fromDate: string;
    toDate: string;
    remarks: string;
};

export type HkeFormRow = {
    hike: string;
    fromDate: string;
    toDate: string;
    remarks: string;
};

export type HkeFormData = {
    records: HkeFormRow[];
};
