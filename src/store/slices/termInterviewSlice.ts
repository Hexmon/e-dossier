import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TermVariant = 'beginning' | 'postmid' | 'special';

export interface SpecialInterviewRecord {
    date: string;
    summary: string;
    interviewedBy: string;
}

export interface TermInterviewFormData {
    formFields: Record<string, string>;
    specialInterviews?: SpecialInterviewRecord[];
}

interface TermInterviewState {
    // Structure: { ocId: { termIndex: { variant: formData } } }
    forms: Record<string, Record<number, Record<TermVariant, TermInterviewFormData>>>;
}

const initialState: TermInterviewState = {
    forms: {},
};

const termInterviewSlice = createSlice({
    name: 'termInterview',
    initialState,
    reducers: {
        saveTermInterviewForm: (
            state,
            action: PayloadAction<{
                ocId: string;
                termIndex: number;
                variant: TermVariant;
                data: TermInterviewFormData;
            }>
        ) => {
            const { ocId, termIndex, variant, data } = action.payload;

            // Initialize structure if needed
            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            if (!state.forms[ocId][termIndex]) {
                state.forms[ocId][termIndex] = {
                    beginning: { formFields: {} },
                    postmid: { formFields: {} },
                    special: { formFields: {}, specialInterviews: [] },
                };
            }

            state.forms[ocId][termIndex][variant] = data;
        },
        clearTermInterviewForm: (
            state,
            action: PayloadAction<{
                ocId: string;
                termIndex: number;
                variant: TermVariant;
            }>
        ) => {
            const { ocId, termIndex, variant } = action.payload;
            if (state.forms[ocId]?.[termIndex]) {
                state.forms[ocId][termIndex][variant] = {
                    formFields: {},
                    specialInterviews: variant === 'special' ? [] : undefined,
                };
            }
        },
        clearAllTermInterviewForms: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllOcTermForms: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveTermInterviewForm,
    clearTermInterviewForm,
    clearAllTermInterviewForms,
    clearAllOcTermForms,
} = termInterviewSlice.actions;

export default termInterviewSlice.reducer;