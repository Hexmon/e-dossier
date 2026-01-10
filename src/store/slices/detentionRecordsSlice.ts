// store/slices/detentionRecordsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DetentionRecordFormData {
    id?: string | null;
    semester: number;
    reason: string;
    type: string;
    dateFrom: string;
    dateTo: string;
    remark: string;
}

interface DetentionRecordsState {
    forms: Record<string, DetentionRecordFormData[]>; // keyed by ocId
}

const initialState: DetentionRecordsState = {
    forms: {},
};

const detentionRecordsSlice = createSlice({
    name: 'detentionRecords',
    initialState,
    reducers: {
        saveDetentionForm: (
            state,
            action: PayloadAction<{ ocId: string; data: DetentionRecordFormData[] }>
        ) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearDetentionForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllDetentionForms: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveDetentionForm,
    clearDetentionForm,
    clearAllDetentionForms,
} = detentionRecordsSlice.actions;

export default detentionRecordsSlice.reducer;