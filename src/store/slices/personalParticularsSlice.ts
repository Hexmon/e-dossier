import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { OCPersonalRecord } from '@/app/lib/api/ocPersonalApi';

interface PersonalParticularsState {
    forms: Record<string, OCPersonalRecord>; // keyed by ocId
}

const initialState: PersonalParticularsState = {
    forms: {},
};

const personalParticularsSlice = createSlice({
    name: 'personalParticulars',
    initialState,
    reducers: {
        savePersonalForm: (state, action: PayloadAction<{ ocId: string; data: OCPersonalRecord }>) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearPersonalForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllPersonalForms: (state) => {
            state.forms = {};
        },
    },
});

export const { savePersonalForm, clearPersonalForm, clearAllPersonalForms } = personalParticularsSlice.actions;
export default personalParticularsSlice.reducer;