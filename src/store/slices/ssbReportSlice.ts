import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SSBFormData } from '@/components/ssb/SSBReportForm';

interface SsbReportState {
    forms: Record<string, SSBFormData>; // keyed by ocId
}

const initialState: SsbReportState = {
    forms: {},
};

const ssbReportSlice = createSlice({
    name: 'ssbReport',
    initialState,
    reducers: {
        saveSsbForm: (state, action: PayloadAction<{ ocId: string; data: SSBFormData }>) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearSsbForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllSsbForms: (state) => {
            state.forms = {};
        },
    },
});

export const { saveSsbForm, clearSsbForm, clearAllSsbForms } = ssbReportSlice.actions;
export default ssbReportSlice.reducer;