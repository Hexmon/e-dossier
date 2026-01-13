import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type InterviewOfficer = 'plcdr' | 'dscoord' | 'dycdr' | 'cdr';

export interface InterviewFormData {
    [key: string]: string | boolean | undefined;
}

interface InitialInterviewState {
    // Structure: { ocId: { officer: formData } }
    forms: Record<string, Record<InterviewOfficer, InterviewFormData>>;
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
                officer: InterviewOfficer;
                data: InterviewFormData
            }>
        ) => {
            const { ocId, officer, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {
                    plcdr: {},
                    dscoord: {},
                    dycdr: {},
                    cdr: {},
                };
            }
            state.forms[ocId][officer] = data;
        },
        clearInterviewForm: (
            state,
            action: PayloadAction<{ ocId: string; officer: InterviewOfficer }>
        ) => {
            const { ocId, officer } = action.payload;
            if (state.forms[ocId]) {
                state.forms[ocId][officer] = {};
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