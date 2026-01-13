// types/med-records.ts

// Base row data (without medical details)
export interface MedInfoRowData {
    date: string;
    age: string;
    height: string;
    ibw: string;
    abw: string;
    overw: string;
    bmi: string;
    chest: string;
}

// Extended row with medical details (for saved data from backend)
export interface MedInfoRow extends MedInfoRowData {
    id?: string;
    term?: string;
    semester?: number;
    medicalHistory: string;
    medicalIssues: string;
    allergies: string;
}

// Form structure
export interface MedicalInfoForm {
    medInfo: MedInfoRowData[]; // Form only needs row data, not the full details
    medicalHistory: string;
    medicalIssues: string;
    allergies: string;
}

export interface MedCatRow {
    id?: string;
    term?: string;
    semester?: number;
    date: string;
    diagnosis: string;
    catFrom: string;
    catTo: string;
    mhFrom: string;
    mhTo: string;
    absence: string;
    piCdrInitial: string;
}

export interface MedicalCategoryFormData {
    records: MedCatRow[];
}

export interface MedCatBackendPayload {
    semester: number;
    date: string;
    mosAndDiagnostics: string;
    catFrom: string;
    catTo: string;
    mhFrom: string;
    mhTo: string;
    absence: string;
    platoonCommanderName: string;
}