import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MedicalCategoryRowData {
    date: string;
    diagnosis: string;
    catFrom: string;
    catTo: string;
    mhFrom: string;
    mhTo: string;
    absence: string;
    piCdrInitial: string;
}

interface MedicalCategoryState {
    forms: Record<string, MedicalCategoryRowData[]>; // keyed by ocId
}

const initialState: MedicalCategoryState = {
    forms: {},
};

const medicalCategorySlice = createSlice({
    name: 'medicalCategory',
    initialState,
    reducers: {
        saveMedicalCategoryForm: (
            state,
            action: PayloadAction<{ ocId: string; data: MedicalCategoryRowData[] }>
        ) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearMedicalCategoryForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllMedicalCategoryForms: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveMedicalCategoryForm,
    clearMedicalCategoryForm,
    clearAllMedicalCategoryForms,
} = medicalCategorySlice.actions;

export default medicalCategorySlice.reducer;