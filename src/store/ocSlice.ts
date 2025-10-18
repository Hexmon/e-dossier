// src/store/ocSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { OCRecord } from "@/config/app.config";

interface OCState {
  ocList: OCRecord[];
}

const initialState: OCState = {
  ocList: [],
};

const ocSlice = createSlice({
  name: "oc",
  initialState,
  reducers: {
    setOCList: (state, action: PayloadAction<OCRecord[]>) => {
      state.ocList = action.payload;
    },
    addOC: (state, action: PayloadAction<OCRecord>) => {
      state.ocList.push(action.payload);
    },
    updateOC: (state, action: PayloadAction<{ index: number; data: OCRecord }>) => {
      state.ocList[action.payload.index] = action.payload.data;
    },
    deleteOC: (state, action: PayloadAction<number>) => {
      state.ocList.splice(action.payload, 1);
    },
  },
});

export const { setOCList, addOC, updateOC, deleteOC } = ocSlice.actions;
export default ocSlice.reducer;
