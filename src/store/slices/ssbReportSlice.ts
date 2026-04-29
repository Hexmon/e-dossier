import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SSBFormData } from '@/components/ssb/SSBReportForm';

interface SsbReportState {
    forms: Record<string, SSBFormData>; // keyed by ocId
}

const initialState: SsbReportState = {
    forms: {},
};

function cloneSsbFormData(data: SSBFormData): SSBFormData {
    return {
        positiveTraits: (data.positiveTraits ?? []).map((item) => ({ trait: item?.trait ?? "" })),
        negativeTraits: (data.negativeTraits ?? []).map((item) => ({ trait: item?.trait ?? "" })),
        positiveBy: data.positiveBy ?? "",
        negativeBy: data.negativeBy ?? "",
        rating: data.rating ?? "",
        improvement: data.improvement ?? "",
    };
}

const ssbReportSlice = createSlice({
    name: 'ssbReport',
    initialState,
    reducers: {
        saveSsbForm: (state, action: PayloadAction<{ ocId: string; data: SSBFormData }>) => {
            state.forms[action.payload.ocId] = cloneSsbFormData(action.payload.data);
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
