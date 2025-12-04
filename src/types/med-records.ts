export interface MedInfoRow {
    id?: string;
    term?: string;
    semester?: number;
    date: string;
    age: string;
    height: string;
    ibw: string;
    abw: string;
    overw: string;
    bmi: string;
    chest: string;
    medicalHistory: string;
    medicalIssues: string;
    allergies: string;
}

export interface MedicalInfoForm {
    medInfo: MedInfoRow[];
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