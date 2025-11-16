export interface Row {
    activity: string;
    string: string;
    maxMarks: string | number;
    obtained: string;
}

export interface SemesterData {
    spring: Row[];
    autumn: Row[];
    motivation: Row[];
}