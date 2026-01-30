import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SpeedMarchFormRow {
    id?: string;
    test: string;
    timing10Label?: string;
    distance10?: string;
    timing20Label?: string;
    distance20?: string;
    timing30Label?: string;
    distance30?: string;
    marks?: string;
    remark?: string;
}

export interface SpeedMarchTermData {
    records: SpeedMarchFormRow[];
}

interface SpeedMarchState {
    // Stores form data per ocId per semester (4-7 for IV-VII TERM)
    forms: Record<string, Record<number, SpeedMarchTermData>>;
}

const initialState: SpeedMarchState = {
    forms: {},
};

const speedMarchSlice = createSlice({
    name: 'speedMarch',
    initialState,
    reducers: {
        saveSpeedMarchForm: (
            state,
            action: PayloadAction<{
                ocId: string;
                semester: number;
                data: SpeedMarchTermData;
            }>
        ) => {
            const { ocId, semester, data } = action.payload;

            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }

            state.forms[ocId][semester] = data;
        },

        clearSpeedMarchForm: (
            state,
            action: PayloadAction<{ ocId: string; semester: number }>
        ) => {
            const { ocId, semester } = action.payload;
            if (state.forms[ocId]) {
                delete state.forms[ocId][semester];
            }
        },

        clearAllSpeedMarchForOc: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },

        clearAllSpeedMarch: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveSpeedMarchForm,
    clearSpeedMarchForm,
    clearAllSpeedMarchForOc,
    clearAllSpeedMarch,
} = speedMarchSlice.actions;

export default speedMarchSlice.reducer;