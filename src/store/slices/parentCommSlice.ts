import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ParentCommFormData {
    serialNo?: string;
    letterNo?: string;
    date?: string;
    teleCorres?: string;
    briefContents?: string;
    sigPICdr?: string;
}

interface ParentCommState {
    forms: Record<string, ParentCommFormData[]>;
}

const initialState: ParentCommState = {
    forms: {},
};

const parentCommSlice = createSlice({
    name: 'parentComm',
    initialState,
    reducers: {
        saveParentCommForm: (
            state,
            action: PayloadAction<{ ocId: string; data: ParentCommFormData[] }>
        ) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearParentCommForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllParentCommForms: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveParentCommForm,
    clearParentCommForm,
    clearAllParentCommForms,
} = parentCommSlice.actions;

export default parentCommSlice.reducer;