export interface Qualification {
    qualification: string;
    school: string;
    subs: string;
    board: string;
    marks: string;
    grade: string;
}

export interface FamilyMember {
    name: string;
    relation: string;
    age?: string | number;
    occupation?: string;
    education?: string;
    mobile?: string;
}

export interface Achievement {
    id?: string;
    event: string;
    year: number | string;
    level: string;
    prize: string;
}

export interface AutoBio {
    general: string;
    proficiency: string;
    work: string;
    additional: string;
    date: string;
    sign_oc: string;
    sign_pi: string;
}

export interface AutoBioAPI {
    generalSelf: string;
    proficiencySports: string;
    achievementsNote: string;
    areasToWork: string;
    filledOn: string;
    platoonCommanderName: string;
}
