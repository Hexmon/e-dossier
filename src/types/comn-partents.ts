// ─────────────── TYPES ───────────────
export interface ParentCommRow {
    id?:string;
    serialNo: string;
    letterNo: string;
    date: string;
    teleCorres: string;
    briefContents: string;
    sigPICdr: string;
}

export interface ParentCommForm {
    records: ParentCommRow[];
}