import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AutobiographyFormData {
    general: string;
    proficiency: string;
    work: string;
    additional: string;
    date: string;
    sign_oc: string;
    sign_pi: string;
}

interface AutobiographyState {
    forms: Record<string, AutobiographyFormData>; // keyed by ocId
}

const initialState: AutobiographyState = {
    forms: {},
};

const autobiographySlice = createSlice({
    name: 'autobiography',
    initialState,
    reducers: {
        saveAutobiographyForm: (state, action: PayloadAction<{ ocId: string; data: AutobiographyFormData }>) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearAutobiographyForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllAutobiographyForms: (state) => {
            state.forms = {};
        },
    },
});

export const { saveAutobiographyForm, clearAutobiographyForm, clearAllAutobiographyForms } = autobiographySlice.actions;
export default autobiographySlice.reducer;