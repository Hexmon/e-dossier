// store/slices/disciplineRecordsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DisciplineRecordFormData {
    serialNo: string;
    dateOfOffence: string;
    offence: string;
    punishmentAwarded: string;
    dateOfAward: string;
    byWhomAwarded: string;
    negativePts: string;
    cumulative: string;
}

interface DisciplineRecordsState {
    forms: Record<string, DisciplineRecordFormData[]>; // keyed by ocId
}

const initialState: DisciplineRecordsState = {
    forms: {},
};

const disciplineRecordsSlice = createSlice({
    name: 'disciplineRecords',
    initialState,
    reducers: {
        saveDisciplineForm: (
            state,
            action: PayloadAction<{ ocId: string; data: DisciplineRecordFormData[] }>
        ) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearDisciplineForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllDisciplineForms: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveDisciplineForm,
    clearDisciplineForm,
    clearAllDisciplineForms,
} = disciplineRecordsSlice.actions;

export default disciplineRecordsSlice.reducer;