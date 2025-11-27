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

export interface HikeRow {
    id: string | null;
    semester: number;
    reason: string;
    type: "HIKE" | "LEAVE" | "OVERSTAY" | "DETENTION";
    dateFrom: string;
    dateTo: string;
    remark: string;
}

export interface HikeFormValues {
    hikeRows: HikeRow[];
}

export const defaultHikeRows: HikeRow[] = [
    {
        id: null,
        semester: 1,
        reason: "",
        type: "HIKE",
        dateFrom: "",
        dateTo: "",
        remark: "",
    },
];

