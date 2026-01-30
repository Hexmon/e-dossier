// store/slices/medicalInfoSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MedicalInfoRowData {
    date: string;
    age: string;
    height: string;
    ibw: string;
    abw: string;
    overw: string;
    bmi: string;
    chest: string;
}

export interface MedicalDetailsFormData {
    medicalHistory: string;
    medicalIssues: string;
    allergies: string;
}

interface MedicalInfoState {
    forms: Record<string, {
        medInfo: MedicalInfoRowData[];
        details: MedicalDetailsFormData;
    }>; // keyed by ocId
}

const initialState: MedicalInfoState = {
    forms: {},
};

const medicalInfoSlice = createSlice({
    name: 'medicalInfo',
    initialState,
    reducers: {
        saveMedicalInfoForm: (
            state,
            action: PayloadAction<{
                ocId: string;
                medInfo: MedicalInfoRowData[];
                details: MedicalDetailsFormData;
            }>
        ) => {
            state.forms[action.payload.ocId] = {
                medInfo: action.payload.medInfo,
                details: action.payload.details,
            };
        },
        clearMedicalInfoForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllMedicalInfoForms: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveMedicalInfoForm,
    clearMedicalInfoForm,
    clearAllMedicalInfoForms,
} = medicalInfoSlice.actions;

export default medicalInfoSlice.reducer;