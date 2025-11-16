// TYPES --------------------
export type ClubRow = {
    semester: string;
    clubName: string;
    splAchievement: string;
    remarks: string;
};

export type DrillRow = {
    semester: string;
    maxMks: number | "";
    m1: number | "";
    m2: number | "";
    a1c1: number | "";
    a2c2: number | "";
    remarks: string;
};

export type FormValues = {
    clubRows: ClubRow[];
    drillRows: DrillRow[];
    splAchievementsList: string[];
};
