import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface EducationQualificationFormData {
    qualification: string;
    school: string;
    subs: string;
    board: string;
    marks: string;
    grade: string;
}

interface EducationQualificationState {
    forms: Record<string, EducationQualificationFormData[]>; // keyed by ocId
}

const initialState: EducationQualificationState = {
    forms: {},
};

const educationQualificationSlice = createSlice({
    name: 'educationQualification',
    initialState,
    reducers: {
        saveEducationForm: (state, action: PayloadAction<{ ocId: string; data: EducationQualificationFormData[] }>) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearEducationForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllEducationForms: (state) => {
            state.forms = {};
        },
    },
});

export const { saveEducationForm, clearEducationForm, clearAllEducationForms } = educationQualificationSlice.actions;
export default educationQualificationSlice.reducer;