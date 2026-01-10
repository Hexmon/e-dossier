import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types for Activities
export interface CampActivityFormRow {
    trainingCampActivityId: string;
    name: string;
    marksScored: number | null;
    defaultMaxMarks: number;
    remark?: string | null;
    ocActivityId?: string;
}

// Types for Reviews
export type ReviewRole = "HOAT" | "OIC" | "PLATOON_COMMANDER";

export interface CampReviewFormRow {
    role: ReviewRole;
    sectionTitle: string;
    reviewText: string;
}

// Combined camp form data
export interface CampFormData {
    trainingCampId?: string;
    year?: number;
    activities?: CampActivityFormRow[];
    reviews?: CampReviewFormRow[];
}

interface CampState {
    // Stores form data per ocId per campName
    forms: Record<string, Record<string, CampFormData>>;
}

const initialState: CampState = {
    forms: {},
};

const campSlice = createSlice({
    name: 'camp',
    initialState,
    reducers: {
        // Save entire camp form (activities + reviews)
        saveCampForm: (
            state,
            action: PayloadAction<{
                ocId: string;
                campName: string;
                data: CampFormData;
            }>
        ) => {
            const { ocId, campName, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            state.forms[ocId][campName] = data;
        },

        // Save only activities for a camp
        saveCampActivities: (
            state,
            action: PayloadAction<{
                ocId: string;
                campName: string;
                activities: CampActivityFormRow[];
            }>
        ) => {
            const { ocId, campName, activities } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            if (!state.forms[ocId][campName]) {
                state.forms[ocId][campName] = {};
            }
            state.forms[ocId][campName].activities = activities;
        },

        // Save only reviews for a camp
        saveCampReviews: (
            state,
            action: PayloadAction<{
                ocId: string;
                campName: string;
                reviews: CampReviewFormRow[];
            }>
        ) => {
            const { ocId, campName, reviews } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {};
            }
            if (!state.forms[ocId][campName]) {
                state.forms[ocId][campName] = {};
            }
            state.forms[ocId][campName].reviews = reviews;
        },

        // Clear specific camp form
        clearCampForm: (
            state,
            action: PayloadAction<{ ocId: string; campName: string }>
        ) => {
            const { ocId, campName } = action.payload;
            if (state.forms[ocId]) {
                delete state.forms[ocId][campName];
            }
        },

        // Clear all camps for an OC
        clearAllCampsForOc: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },

        // Clear all camp data
        clearAllCamps: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveCampForm,
    saveCampActivities,
    saveCampReviews,
    clearCampForm,
    clearAllCampsForOc,
    clearAllCamps,
} = campSlice.actions;

export default campSlice.reducer;