import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ObstacleTrainingFormRow {
    id?: string;
    obstacle: string;
    obtained: string;
    remark?: string;
}

export interface ObstacleTrainingTermData {
    records: ObstacleTrainingFormRow[];
}

interface ObstacleTrainingState {
    // Stores form data per ocId per semester (4-7 for IV-VII TERM)
    forms: Record<string, Record<number, ObstacleTrainingTermData>>;
}

const initialState: ObstacleTrainingState = {
    forms: {},
};

const obstacleTrainingSlice = createSlice({
    name: 'obstacleTraining',
    initialState,
    reducers: {
        saveObstacleTrainingForm: (
            state,
            action: PayloadAction<{
                ocId: string;
                semester: number;
                data: ObstacleTrainingTermData;
            }>
        ) => {
            const { ocId, semester, data } = action.payload;

            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }

            state.forms[ocId][semester] = data;
        },

        clearObstacleTrainingForm: (
            state,
            action: PayloadAction<{ ocId: string; semester: number }>
        ) => {
            const { ocId, semester } = action.payload;
            if (state.forms[ocId]) {
                delete state.forms[ocId][semester];
            }
        },

        clearAllObstacleTrainingForOc: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },

        clearAllObstacleTraining: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveObstacleTrainingForm,
    clearObstacleTrainingForm,
    clearAllObstacleTrainingForOc,
    clearAllObstacleTraining,
} = obstacleTrainingSlice.actions;

export default obstacleTrainingSlice.reducer;