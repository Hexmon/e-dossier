export type InterviewOfficer = "plcdr" | "dscoord" | "dycdr" | "cdr";

export interface InterviewFormRecord {
    id?: string;
    officer: InterviewOfficer;
    [key: string]: string | number | boolean | undefined;
}
