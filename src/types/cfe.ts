export type cfeRow = {
    id?: string;
    serialNo: string;
    cat: string;
    mks: string;
    remarks: string;
    sub_category: string;
};

export type cfeFormData = {
    records: cfeRow[];
};

export const defaultRow: cfeRow = {
    serialNo: "",
    cat: "",
    mks: "",
    remarks: "",
    sub_category: "",
};