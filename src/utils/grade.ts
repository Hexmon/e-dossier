export function getLetterGrade(total: number): string {
    if (total >= 85) return "A";
    if (total >= 70) return "B";
    if (total >= 55) return "C";
    if (total >= 40) return "D";
    return "F";
}
