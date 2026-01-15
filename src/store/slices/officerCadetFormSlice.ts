import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { OfficerCadetForm } from '@/types/dossierSnap';

interface OfficerCadetFormState {
    forms: Record<string, OfficerCadetForm>;
}

const initialState: OfficerCadetFormState = {
    forms: {},
};

const officerCadetFormSlice = createSlice({
    name: 'officerCadetForm',
    initialState,
    reducers: {
        saveForm: (state, action: PayloadAction<{ ocId: string; data: OfficerCadetForm }>) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllForms: (state) => {
            state.forms = {};
        },
    },
});

export const { saveForm, clearForm, clearAllForms } = officerCadetFormSlice.actions;
export default officerCadetFormSlice.reducer;