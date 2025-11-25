// TYPES --------------------
export type ClubRow = {
    id?: string | null;
    semester: string;
    clubName: string;
    splAchievement: string;
    remarks: string;
};

export type DrillRow = {
    id?: string;
    semester: string;
    maxMks: number | "";
    m1: number | "";
    m2: number | "";
    a1c1: number | "";
    a2c2: number | "";
    remarks: string;
};

export type AchievementRow = {
    id?: string | null;
    achievement: string;
};

export type FormValues = {
    clubRows: ClubRow[];
    drillRows: DrillRow[];
    achievements: AchievementRow[];
};
