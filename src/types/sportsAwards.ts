export interface Row {
    id?:string;
    ocId?:string;
    term?:string;
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