import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { DossierFormData } from '@/types/dossierFilling';

interface DossierFillingState {
    forms: Record<string, DossierFormData>;
}

const initialState: DossierFillingState = {
    forms: {},
};

const dossierFillingSlice = createSlice({
    name: 'dossierFilling',
    initialState,
    reducers: {
        saveDossierForm: (state, action: PayloadAction<{ ocId: string; data: DossierFormData }>) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearDossierForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllDossierForms: (state) => {
            state.forms = {};
        },
    },
});

export const { saveDossierForm, clearDossierForm, clearAllDossierForms } = dossierFillingSlice.actions;
export default dossierFillingSlice.reducer;