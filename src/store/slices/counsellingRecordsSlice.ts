import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CounsellingRecordFormData {
    term: string;
    reason: string;
    warningType: string;
    date: string;
    warningBy: string;
}

interface CounsellingRecordsState {
    forms: Record<string, CounsellingRecordFormData[]>; // keyed by ocId
}

const initialState: CounsellingRecordsState = {
    forms: {},
};

const counsellingRecordsSlice = createSlice({
    name: 'counsellingRecords',
    initialState,
    reducers: {
        saveCounsellingForm: (
            state,
            action: PayloadAction<{ ocId: string; data: CounsellingRecordFormData[] }>
        ) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearCounsellingForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllCounsellingForms: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveCounsellingForm,
    clearCounsellingForm,
    clearAllCounsellingForms,
} = counsellingRecordsSlice.actions;

export default counsellingRecordsSlice.reducer;