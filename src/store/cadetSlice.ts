import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type Cadet = {
  name: string;
  course: string;
  courseName: string;
  ocNumber: string;
  ocId: string;
};

interface CadetState {
  selectedCadet: Cadet | null;
}

const initialState: CadetState = {
  selectedCadet: null as Cadet | null,
};

const cadetSlice = createSlice({
  name: "cadet",
  initialState,
  reducers: {
    setSelectedCadet: (state, action: PayloadAction<Cadet>) => {
      state.selectedCadet = action.payload;
    },
    clearCadet: (state) => {
      state.selectedCadet = null;
    },
  },
});

export const { setSelectedCadet, clearCadet } = cadetSlice.actions;
export default cadetSlice.reducer;
