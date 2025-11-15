export interface MedInfoRow {
    id?: string;
    term?: string;
    date: string;
    age: string;
    height: string;
    ibw: string;
    abw: string;
    overw: string;
    bmi: string;
    chest: string;
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
    date: string;
    diagnosis: string;
    catFrom: string;
    catTo: string;
    mhFrom: string;
    mhTo: string;
    absence: string;
    piCdrInitial: string;
}

export interface MedicalCategoryForm {
    records: MedCatRow[];
}