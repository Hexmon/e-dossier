import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SportsAwardsFormRow {
    id?: string;
    ocId?: string;
    term?: string;
    activity: string;
    string: string;
    maxMarks: string | number;
    obtained: string;
}

export interface SportsAwardsSemesterData {
    spring: SportsAwardsFormRow[];
    autumn: SportsAwardsFormRow[];
    motivation: SportsAwardsFormRow[];
}

interface SportsAwardsState {
    // Stores form data per ocId per semester (1-6)
    forms: Record<string, Record<number, SportsAwardsSemesterData>>;
}

const initialState: SportsAwardsState = {
    forms: {},
};

const sportsAwardsSlice = createSlice({
    name: 'sportsAwards',
    initialState,
    reducers: {
        saveSportsAwardsForm: (
            state,
            action: PayloadAction<{
                ocId: string;
                semester: number;
                data: SportsAwardsSemesterData;
            }>
        ) => {
            const { ocId, semester, data } = action.payload;

            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }

            state.forms[ocId][semester] = data;
        },

        clearSportsAwardsForm: (
            state,
            action: PayloadAction<{ ocId: string; semester: number }>
        ) => {
            const { ocId, semester } = action.payload;
            if (state.forms[ocId]) {
                delete state.forms[ocId][semester];
            }
        },

        clearAllSportsAwardsForOc: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },

        clearAllSportsAwards: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveSportsAwardsForm,
    clearSportsAwardsForm,
    clearAllSportsAwardsForOc,
    clearAllSportsAwards,
} = sportsAwardsSlice.actions;

export default sportsAwardsSlice.reducer;