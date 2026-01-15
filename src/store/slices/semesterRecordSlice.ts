import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define types for semester record data
export interface SemesterTableData {
    id: string;
    column1: number;
    column2: string;
    column3: number;
    column4: string;
    column5: string;
}

export interface SemesterReviews {
    pc: string;
    dc: string;
    commander: string;
}

export interface SemesterData {
    tableData: Record<string, string>; // rowId -> marks scored
    remarks: Record<string, string>; // rowId -> remarks
    reviews: SemesterReviews;
}

export interface SemesterRecordState {
    forms: Record<string, Record<string, SemesterData>>; // ocId -> semester -> data
}

const initialState: SemesterRecordState = {
    forms: {},
};

const semesterRecordSlice = createSlice({
    name: 'semesterRecord',
    initialState,
    reducers: {
        // Save marks scored for a specific row in a semester
        saveMarksScored: (
            state,
            action: PayloadAction<{
                ocId: string;
                semester: string;
                rowId: string;
                value: string;
            }>
        ) => {
            const { ocId, semester, rowId, value } = action.payload;

            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            if (!state.forms[ocId][semester]) {
                state.forms[ocId][semester] = {
                    tableData: {},
                    remarks: {},
                    reviews: { pc: '', dc: '', commander: '' },
                };
            }

            state.forms[ocId][semester].tableData[rowId] = value;
        },

        // Save remark for a specific row in a semester
        saveRemark: (
            state,
            action: PayloadAction<{
                ocId: string;
                semester: string;
                rowId: string;
                value: string;
            }>
        ) => {
            const { ocId, semester, rowId, value } = action.payload;

            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            if (!state.forms[ocId][semester]) {
                state.forms[ocId][semester] = {
                    tableData: {},
                    remarks: {},
                    reviews: { pc: '', dc: '', commander: '' },
                };
            }

            state.forms[ocId][semester].remarks[rowId] = value;
        },

        // Save reviews for a semester
        saveReviews: (
            state,
            action: PayloadAction<{
                ocId: string;
                semester: string;
                reviews: SemesterReviews;
            }>
        ) => {
            const { ocId, semester, reviews } = action.payload;

            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            if (!state.forms[ocId][semester]) {
                state.forms[ocId][semester] = {
                    tableData: {},
                    remarks: {},
                    reviews: { pc: '', dc: '', commander: '' },
                };
            }

            state.forms[ocId][semester].reviews = reviews;
        },

        // Clear data for a specific semester
        clearSemesterData: (
            state,
            action: PayloadAction<{ ocId: string; semester: string }>
        ) => {
            const { ocId, semester } = action.payload;

            if (state.forms[ocId]?.[semester]) {
                delete state.forms[ocId][semester];
            }
        },

        // Clear all data for a specific cadet
        clearCadetData: (state, action: PayloadAction<string>) => {
            const ocId = action.payload;
            delete state.forms[ocId];
        },

        // Clear all data
        clearAllData: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveMarksScored,
    saveRemark,
    saveReviews,
    clearSemesterData,
    clearCadetData,
    clearAllData,
} = semesterRecordSlice.actions;

export default semesterRecordSlice.reducer;