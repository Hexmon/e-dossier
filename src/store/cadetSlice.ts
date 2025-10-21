import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type Cadet = {
  name: string;
  course: string;
  ocNumber: string;
};

interface CadetState {
  selectedCadet: Cadet | null;
}

const initialState: CadetState = {
  selectedCadet: null,
};

const cadetSlice = createSlice({
  name: "cadet",
  initialState,
  reducers: {
    setSelectedCadet: (state, action: PayloadAction<Cadet | null>) => {
      state.selectedCadet = action.payload;
    },
    clearCadet: (state) => {
      state.selectedCadet = null;
    },
  },
});

export const { setSelectedCadet, clearCadet } = cadetSlice.actions;
export default cadetSlice.reducer;
