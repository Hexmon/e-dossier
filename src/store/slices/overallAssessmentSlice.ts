import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// OLQ Assessment Row
export interface OlqRow {
    factor: string;
    column1: number;
    column2: number;
    column3: number;
    column4: number;
    column5: number;
    remarks: string;
}

// Appointment Row
export interface Appointment {
    id: string;
    appointments: string;
    from: string;
    to: string;
    remarks: string;
    isRowEditing?: boolean;
}

// Relegation Row
export interface Relegation {
    id: string;
    dateOfRelegation: string;
    courseRelegatedTo: string;
    reason: string;
    isRowEditing?: boolean;
}

// Withdrawal Row
export interface Withdrawal {
    id: string;
    dateWithdrawn: string;
    reason: string;
    isRowEditing?: boolean;
}

// Overall Performance Row
export interface OverallPerformanceRow {
    id: string;
    column1: number;
    column2: string;
    column3: number;
    column4: string;
    column5: string;
    column6: string;
    column7: string;
    column8: string;
    column9: string;
    column10: string;
    column11: string;
}

// Complete state for one cadet
export interface CadetOverallAssessment {
    olqTableData: OlqRow[];
    observations: string;
    appointments: Appointment[];
    relegations: Relegation[];
    withdrawals: Withdrawal[];
    overallPerformance: OverallPerformanceRow[];
}

export interface OverallAssessmentState {
    forms: Record<string, CadetOverallAssessment>; // keyed by ocId
}

const initialState: OverallAssessmentState = {
    forms: {},
};

const overallAssessmentSlice = createSlice({
    name: 'overallAssessment',
    initialState,
    reducers: {
        // OLQ Assessment Actions
        saveOlqTableData: (
            state,
            action: PayloadAction<{ ocId: string; data: OlqRow[] }>
        ) => {
            const { ocId, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {
                    olqTableData: [],
                    observations: '',
                    appointments: [],
                    relegations: [],
                    withdrawals: [],
                    overallPerformance: [],
                };
            }
            state.forms[ocId].olqTableData = data;
        },

        saveObservations: (
            state,
            action: PayloadAction<{ ocId: string; data: string }>
        ) => {
            const { ocId, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {
                    olqTableData: [],
                    observations: '',
                    appointments: [],
                    relegations: [],
                    withdrawals: [],
                    overallPerformance: [],
                };
            }
            state.forms[ocId].observations = data;
        },

        // Appointments Actions
        saveAppointments: (
            state,
            action: PayloadAction<{ ocId: string; data: Appointment[] }>
        ) => {
            const { ocId, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {
                    olqTableData: [],
                    observations: '',
                    appointments: [],
                    relegations: [],
                    withdrawals: [],
                    overallPerformance: [],
                };
            }
            state.forms[ocId].appointments = data;
        },

        // Relegations Actions
        saveRelegations: (
            state,
            action: PayloadAction<{ ocId: string; data: Relegation[] }>
        ) => {
            const { ocId, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {
                    olqTableData: [],
                    observations: '',
                    appointments: [],
                    relegations: [],
                    withdrawals: [],
                    overallPerformance: [],
                };
            }
            state.forms[ocId].relegations = data;
        },

        // Withdrawals Actions
        saveWithdrawals: (
            state,
            action: PayloadAction<{ ocId: string; data: Withdrawal[] }>
        ) => {
            const { ocId, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {
                    olqTableData: [],
                    observations: '',
                    appointments: [],
                    relegations: [],
                    withdrawals: [],
                    overallPerformance: [],
                };
            }
            state.forms[ocId].withdrawals = data;
        },

        // Overall Performance Actions
        saveOverallPerformance: (
            state,
            action: PayloadAction<{ ocId: string; data: OverallPerformanceRow[] }>
        ) => {
            const { ocId, data } = action.payload;
            if (!state.forms[ocId]) {
                state.forms[ocId] = {
                    olqTableData: [],
                    observations: '',
                    appointments: [],
                    relegations: [],
                    withdrawals: [],
                    overallPerformance: [],
                };
            }
            state.forms[ocId].overallPerformance = data;
        },

        // Clear specific cadet data
        clearCadetAssessment: (state, action: PayloadAction<string>) => {
            const ocId = action.payload;
            delete state.forms[ocId];
        },

        // Clear all data
        clearAllAssessments: (state) => {
            state.forms = {};
        },
    },
});

export const {
    saveOlqTableData,
    saveObservations,
    saveAppointments,
    saveRelegations,
    saveWithdrawals,
    saveOverallPerformance,
    clearCadetAssessment,
    clearAllAssessments,
} = overallAssessmentSlice.actions;

export default overallAssessmentSlice.reducer;