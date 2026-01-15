import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface LeaveRecordFormData {
    id?: string | null;
    semester: number;
    reason: string;
    type: "LEAVE" | "OVERSTAY" | "HIKE" | "DETENTION";
    dateFrom: string;
    dateTo: string;
    remark: string;
}

interface LeaveRecordsState {
    forms: Record<string, LeaveRecordFormData[]>; // keyed by ocId
}

const initialState: LeaveRecordsState = {
    forms: {},
};

const leaveRecordsSlice = createSlice({
    name: 'leaveRecords',
    initialState,
    reducers: {
        saveLeaveForm: (
            state,
            action: PayloadAction<{ ocId: string; data: LeaveRecordFormData[] }>
        ) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearLeaveForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllLeaveForms: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveLeaveForm,
    clearLeaveForm,
    clearAllLeaveForms,
} = leaveRecordsSlice.actions;

export default leaveRecordsSlice.reducer;