
import { configureStore } from "@reduxjs/toolkit";
import cadetReducer from "./cadetSlice";
import ocReducer from "./ocSlice";

export const store = configureStore({
  reducer: {
    cadet: cadetReducer,
    oc: ocReducer,
  },
});

// types for hooks
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
