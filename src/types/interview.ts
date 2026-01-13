import { SpecialInterviewRecord } from "@/store/slices/termInterviewSlice";

export type InterviewOfficer = "plcdr" | "dscoord" | "dycdr" | "cdr";

export interface InterviewFormRecord {
    id?: string;
    officer: InterviewOfficer;
    specialInterviews?: SpecialInterviewRecord[];
    [key: string]: string | number | boolean | undefined | SpecialInterviewRecord[];
}
