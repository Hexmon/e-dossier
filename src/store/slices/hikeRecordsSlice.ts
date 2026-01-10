// store/slices/hikeRecordsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface HikeRecordFormData {
    id?: string | null;
    semester: number;
    reason: string;
    type: string;
    dateFrom: string;
    dateTo: string;
    remark: string;
}

interface HikeRecordsState {
    forms: Record<string, HikeRecordFormData[]>; // keyed by ocId
}

const initialState: HikeRecordsState = {
    forms: {},
};

const hikeRecordsSlice = createSlice({
    name: 'hikeRecords',
    initialState,
    reducers: {
        saveHikeForm: (
            state,
            action: PayloadAction<{ ocId: string; data: HikeRecordFormData[] }>
        ) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearHikeForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllHikeForms: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveHikeForm,
    clearHikeForm,
    clearAllHikeForms,
} = hikeRecordsSlice.actions;

export default hikeRecordsSlice.reducer;