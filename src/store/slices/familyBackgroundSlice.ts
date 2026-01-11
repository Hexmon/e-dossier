// store/slices/familyBackgroundSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FamilyMemberFormData {
    name: string;
    relation: string;
    age: string | number;
    occupation: string;
    education: string;
    mobileNo: string;
}

interface FamilyBackgroundState {
    forms: Record<string, FamilyMemberFormData[]>; // keyed by ocId
}

const initialState: FamilyBackgroundState = {
    forms: {},
};

const familyBackgroundSlice = createSlice({
    name: 'familyBackground',
    initialState,
    reducers: {
        saveFamilyForm: (state, action: PayloadAction<{ ocId: string; data: FamilyMemberFormData[] }>) => {
            state.forms[action.payload.ocId] = action.payload.data;
        },
        clearFamilyForm: (state, action: PayloadAction<string>) => {
            delete state.forms[action.payload];
        },
        clearAllFamilyForms: (state) => {
            state.forms = {};
        },
    },
});

export const { saveFamilyForm, clearFamilyForm, clearAllFamilyForms } = familyBackgroundSlice.actions;
export default familyBackgroundSlice.reducer;