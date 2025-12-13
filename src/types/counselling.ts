export type CounsellingRow = {
    id?: string;         // optional id from backend
    serialNo: string;    // auto-generated UI
    term: string;
    reason: string;
    warningType: string; // Relegation | Withdrawal
    date: string;        // ISO date string
    warningBy: string;   // Rank & Name
};

export type CounsellingFormData = {
    records: Array<{
        term: string;
        reason: string;
        warningType: string;
        date: string;
        warningBy: string;
    }>;
};

export const counsellingDefaultRow: CounsellingRow = {
    serialNo: "",
    term: "",
    reason: "",
    warningType: "",
    date: "",
    warningBy: "",
};
