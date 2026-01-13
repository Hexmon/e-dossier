// store/slices/physicalTrainingSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Type definitions
export interface PhysicalTrainingRow {
    id: string;
    column1: number | string;
    column2: string;
    column3: number;
    column4: string;
    column5: string;
    column6: number;
}

export interface Ipet1Row {
    id: string;
    column1: number | string;
    column2: string;
    column3: string;
    column4: string;
    maxMarks: number;
    column5: number;
}

export interface Ipet2Row {
    id: string;
    column1: number | string;
    column2: string;
    maxMarks: number;
    column3: string;
    column4: string;
    column5: number;
}

export interface SwimmingRow {
    id: string;
    column1: number | string;
    column2: string;
    column3: string;
    column4: string;
    maxMarks: number;
    column5: number;
}

export interface HigherTestsRow {
    id: string;
    column1: number;
    column2: string;
    column3: string;
    column4: string;
    maxMarks: number;
    column5: number;
}

export interface MotivationAwardsData {
    meritCard: string;
    halfBlue: string;
    blue: string;
    blazer: string;
}

export interface SemesterData {
    pptData: PhysicalTrainingRow[];
    ipet1Data?: Ipet1Row[];
    ipet2Data?: Ipet2Row[];
    swimmingData?: SwimmingRow[];
    swimming1Data?: SwimmingRow[];
    higherTestsData?: HigherTestsRow[];
    motivationAwards?: MotivationAwardsData;
}

interface PhysicalTrainingState {
    // Keyed by ocId, then by semester
    forms: Record<string, Record<string, SemesterData>>;
}

const initialState: PhysicalTrainingState = {
    forms: {},
};

const physicalTrainingSlice = createSlice({
    name: 'physicalTraining',
    initialState,
    reducers: {
        savePPTData: (
            state,
            action: PayloadAction<{ ocId: string; semester: string; data: PhysicalTrainingRow[] }>
        ) => {
            const { ocId, semester, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            if (!state.forms[ocId][semester]) {
                state.forms[ocId][semester] = { pptData: [] };
            }
            state.forms[ocId][semester].pptData = data;
        },
        saveIpet1Data: (
            state,
            action: PayloadAction<{ ocId: string; semester: string; data: Ipet1Row[] }>
        ) => {
            const { ocId, semester, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            if (!state.forms[ocId][semester]) {
                state.forms[ocId][semester] = { pptData: [] };
            }
            state.forms[ocId][semester].ipet1Data = data;
        },
        saveIpet2Data: (
            state,
            action: PayloadAction<{ ocId: string; semester: string; data: Ipet2Row[] }>
        ) => {
            const { ocId, semester, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            if (!state.forms[ocId][semester]) {
                state.forms[ocId][semester] = { pptData: [] };
            }
            state.forms[ocId][semester].ipet2Data = data;
        },
        saveSwimmingData: (
            state,
            action: PayloadAction<{ ocId: string; semester: string; data: SwimmingRow[] }>
        ) => {
            const { ocId, semester, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            if (!state.forms[ocId][semester]) {
                state.forms[ocId][semester] = { pptData: [] };
            }
            state.forms[ocId][semester].swimmingData = data;
        },
        saveSwimming1Data: (
            state,
            action: PayloadAction<{ ocId: string; semester: string; data: SwimmingRow[] }>
        ) => {
            const { ocId, semester, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            if (!state.forms[ocId][semester]) {
                state.forms[ocId][semester] = { pptData: [] };
            }
            state.forms[ocId][semester].swimming1Data = data;
        },
        saveHigherTestsData: (
            state,
            action: PayloadAction<{ ocId: string; semester: string; data: HigherTestsRow[] }>
        ) => {
            const { ocId, semester, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            if (!state.forms[ocId][semester]) {
                state.forms[ocId][semester] = { pptData: [] };
            }
            state.forms[ocId][semester].higherTestsData = data;
        },
        saveMotivationAwards: (
            state,
            action: PayloadAction<{ ocId: string; semester: string; data: MotivationAwardsData }>
        ) => {
            const { ocId, semester, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            if (!state.forms[ocId][semester]) {
                state.forms[ocId][semester] = { pptData: [] };
            }
            state.forms[ocId][semester].motivationAwards = data;
        },
        clearPhysicalTrainingForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearSemesterData: (
            state,
            action: PayloadAction<{ ocId: string; semester: string }>
        ) => {
            const { ocId, semester } = action.payload;
            if (state.forms[ocId]) {
                delete state.forms[ocId][semester];
            }
        },
        clearAllPhysicalTrainingForms: (state) => {
            state.forms = {};
        },
    },
});

export const {
    savePPTData,
    saveIpet1Data,
    saveIpet2Data,
    saveSwimmingData,
    saveSwimming1Data,
    saveHigherTestsData,
    saveMotivationAwards,
    clearPhysicalTrainingForm,
    clearSemesterData,
    clearAllPhysicalTrainingForms,
} = physicalTrainingSlice.actions;

export default physicalTrainingSlice.reducer;