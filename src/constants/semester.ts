export const SEMESTER_VALUES = [1, 2, 3, 4, 5, 6] as const;

export const SEMESTER_SELECT_OPTIONS = SEMESTER_VALUES.map((semester) => ({
    value: String(semester),
    label: `Semester ${semester}`,
}));
