// store/slices/cfeRecordsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CfeRecordFormData {
    serialNo: string;
    cat: string;
    mks: string;
    remarks: string;
    sub_category: string;
}

interface CfeRecordsState {
    forms: Record<string, CfeRecordFormData[]>; // keyed by ocId
}

const initialState: CfeRecordsState = {
    forms: {},
};

const cfeRecordsSlice = createSlice({
    name: 'cfeRecords',
    initialState,
    reducers: {
        saveCfeForm: (
            state,
            action: PayloadAction<{ ocId: string; data: CfeRecordFormData[] }>
        ) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearCfeForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllCfeForms: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveCfeForm,
    clearCfeForm,
    clearAllCfeForms,
} = cfeRecordsSlice.actions;

export default cfeRecordsSlice.reducer;