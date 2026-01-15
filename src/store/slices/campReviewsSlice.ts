import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ReviewRole } from '@/app/lib/api/campApi';

interface CampReview {
    role: ReviewRole;
    sectionTitle: string;
    reviewText: string;
}

interface CampFormRow {
    trainingCampId: string;
    year: number;
    reviews: CampReview[];
}

interface CampReviewsState {
    forms: Record<string, CampFormRow>; // keyed by campName
}

const initialState: CampReviewsState = {
    forms: {},
};

const campReviewsSlice = createSlice({
    name: 'campReviews',
    initialState,
    reducers: {
        saveCampReviewForm: (
            state,
            action: PayloadAction<{ campName: string; data: CampFormRow }>
        ) => {
            state.forms[action.payload.campName] = action.payload.data;
        },
        clearCampReviewForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllCampReviewForms: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveCampReviewForm,
    clearCampReviewForm,
    clearAllCampReviewForms
} = campReviewsSlice.actions;

export default campReviewsSlice.reducer;