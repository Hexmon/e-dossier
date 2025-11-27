
export type DetentionFormRow = {
    reason: string;
    fromDate: string;
    toDate: string;
    remarks: string;
};

export type DetentionFormData = {
    records: DetentionFormRow[];
};

export interface DetentionRow {
    id: string | null;
    semester: number;
    reason: string;
    type: "DETENTION";
    dateFrom: string;
    dateTo: string;
    remark: string;
}

export interface DetentionFormValues {
    detentionRows: DetentionRow[];
}

export const defaultDetentionRows: DetentionRow[] = [
    {
        id: null,
        semester: 1,
        reason: "",
        type: "DETENTION",
        dateFrom: "",
        dateTo: "",
        remark: "",
    },
];
