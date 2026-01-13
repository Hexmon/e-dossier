import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AchievementFormData {
    event: string;
    year: string | number;
    level: string;
    prize: string;
}

interface AchievementsState {
    forms: Record<string, AchievementFormData[]>; // keyed by ocId
}

const initialState: AchievementsState = {
    forms: {},
};

const achievementsSlice = createSlice({
    name: 'achievements',
    initialState,
    reducers: {
        saveAchievementsForm: (state, action: PayloadAction<{ ocId: string; data: AchievementFormData[] }>) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearAchievementsForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllAchievementsForms: (state) => {
            state.forms = {};
        },
    },
});

export const { saveAchievementsForm, clearAchievementsForm, clearAllAchievementsForms } = achievementsSlice.actions;
export default achievementsSlice.reducer;