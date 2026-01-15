import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { InspFormData } from '@/types/dossierInsp';

interface InspSheetState {
    forms: Record<string, InspFormData>; // keyed by ocId
}

const initialState: InspSheetState = {
    forms: {},
};

const inspSheetSlice = createSlice({
    name: 'inspSheet',
    initialState,
    reducers: {
        saveInspForm: (state, action: PayloadAction<{ ocId: string; data: InspFormData }>) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearInspForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllInspForms: (state) => {
            state.forms = {};
        },
    },
});

export const { saveInspForm, clearInspForm, clearAllInspForms } = inspSheetSlice.actions;
export default inspSheetSlice.reducer;