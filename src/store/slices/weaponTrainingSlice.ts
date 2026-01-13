import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WeaponTrainingFormRow {
    id?: string;
    subject: string;
    maxMarks: number;
    obtained: string;
}

export interface WeaponTrainingAchievement {
    id?: string;
    achievement: string;
}

export interface WeaponTrainingTermData {
    records: WeaponTrainingFormRow[];
    achievements: WeaponTrainingAchievement[];
}

interface WeaponTrainingState {
    // Stores form data per ocId per semester (3-6 for III-VI TERM)
    forms: Record<string, Record<number, WeaponTrainingTermData>>;
}

const initialState: WeaponTrainingState = {
    forms: {},
};

const weaponTrainingSlice = createSlice({
    name: 'weaponTraining',
    initialState,
    reducers: {
        saveWeaponTrainingForm: (
            state,
            action: PayloadAction<{
                ocId: string;
                semester: number;
                data: WeaponTrainingTermData;
            }>
        ) => {
            const { ocId, semester, data } = action.payload;

            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }

            state.forms[ocId][semester] = data;
        },

        clearWeaponTrainingForm: (
            state,
            action: PayloadAction<{ ocId: string; semester: number }>
        ) => {
            const { ocId, semester } = action.payload;
            if (state.forms[ocId]) {
                delete state.forms[ocId][semester];
            }
        },

        clearAllWeaponTrainingForOc: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },

        clearAllWeaponTraining: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveWeaponTrainingForm,
    clearWeaponTrainingForm,
    clearAllWeaponTrainingForOc,
    clearAllWeaponTraining,
} = weaponTrainingSlice.actions;

export default weaponTrainingSlice.reducer;