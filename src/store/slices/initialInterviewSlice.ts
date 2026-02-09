import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type InterviewOfficer = 'plcdr' | 'dscoord' | 'dycdr' | 'cdr';

export interface InterviewFormData {
    [key: string]: string | boolean | undefined;
}

interface InitialInterviewState {
    // Structure: { ocId: { semesterKey: { officer: formData } } }
    forms: Record<string, Record<string, Record<InterviewOfficer, InterviewFormData>>>;
}

const initialState: InitialInterviewState = {
    forms: {},
};

const initialInterviewSlice = createSlice({
    name: 'initialInterview',
    initialState,
    reducers: {
        saveInterviewForm: (
            state,
            action: PayloadAction<{
                ocId: string;
                semesterKey: string;
                officer: InterviewOfficer;
                data: InterviewFormData
            }>
        ) => {
            const { ocId, semesterKey, officer, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            if (!state.forms[ocId][semesterKey]) {
                state.forms[ocId][semesterKey] = {
                    plcdr: {},
                    dscoord: {},
                    dycdr: {},
                    cdr: {},
                };
            }
            state.forms[ocId][semesterKey][officer] = data;
        },
        clearInterviewForm: (
            state,
            action: PayloadAction<{ ocId: string; semesterKey: string; officer: InterviewOfficer }>
        ) => {
            const { ocId, semesterKey, officer } = action.payload;
            if (state.forms[ocId]?.[semesterKey]) {
                state.forms[ocId][semesterKey][officer] = {};
            }
        },
        clearAllInterviewForms: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllOcForms: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveInterviewForm,
    clearInterviewForm,
    clearAllInterviewForms,
    clearAllOcForms,
} = initialInterviewSlice.actions;

export default initialInterviewSlice.reducer;
