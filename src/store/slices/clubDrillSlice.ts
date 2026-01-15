import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ClubRow = {
    id?: string | null;
    semester: string;
    clubName: string;
    splAchievement: string;
    remarks: string;
};

export type DrillRow = {
    id?: string;
    semester: string;
    maxMks: number | "";
    m1: number | "";
    m2: number | "";
    a1c1: number | "";
    a2c2: number | "";
    remarks: string;
};

export type AchievementRow = {
    id?: string | null;
    achievement: string;
};

export interface ClubDrillFormData {
    clubRows: ClubRow[];
    drillRows: DrillRow[];
    achievements: AchievementRow[];
}

interface ClubDrillState {
    // Stores form data per ocId
    forms: Record<string, ClubDrillFormData>;
}

const initialState: ClubDrillState = {
    forms: {},
};

const clubDrillSlice = createSlice({
    name: 'clubDrill',
    initialState,
    reducers: {
        saveClubDrillForm: (
            state,
            action: PayloadAction<{ ocId: string; data: ClubDrillFormData }>
        ) => {
            const { ocId, data } = action.payload;
            state.forms[ocId] = data;
        },

        saveClubRows: (
            state,
            action: PayloadAction<{ ocId: string; clubRows: ClubRow[] }>
        ) => {
            const { ocId, clubRows } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {
                    clubRows: [],
                    drillRows: [],
                    achievements: [],
                };
            }
            state.forms[ocId].clubRows = clubRows;
        },

        saveDrillRows: (
            state,
            action: PayloadAction<{ ocId: string; drillRows: DrillRow[] }>
        ) => {
            const { ocId, drillRows } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {
                    clubRows: [],
                    drillRows: [],
                    achievements: [],
                };
            }
            state.forms[ocId].drillRows = drillRows;
        },

        saveAchievements: (
            state,
            action: PayloadAction<{ ocId: string; achievements: AchievementRow[] }>
        ) => {
            const { ocId, achievements } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {
                    clubRows: [],
                    drillRows: [],
                    achievements: [],
                };
            }
            state.forms[ocId].achievements = achievements;
        },

        clearClubDrillForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },

        clearAllClubDrill: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveClubDrillForm,
    saveClubRows,
    saveDrillRows,
    saveAchievements,
    clearClubDrillForm,
    clearAllClubDrill,
} = clubDrillSlice.actions;

export default clubDrillSlice.reducer;