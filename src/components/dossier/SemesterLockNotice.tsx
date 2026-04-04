import React from "react";

interface SemesterLockNoticeProps {
  activeSemester: number;
  currentSemester: number;
  supportedSemesters?: readonly number[];
  className?: string;
}

export default function SemesterLockNotice({
  activeSemester,
  currentSemester,
  supportedSemesters = [1, 2, 3, 4, 5, 6],
  className = "",
}: SemesterLockNoticeProps) {
  const firstSupportedSemester = supportedSemesters[0] ?? 1;

  let message =
    activeSemester < currentSemester
      ? `Semester ${activeSemester} is read-only. Only the current semester ${currentSemester} can be edited for this OC.`
      : `Semester ${activeSemester} is read-only until this OC reaches that semester. The current semester is ${currentSemester}.`;

  if (currentSemester < firstSupportedSemester) {
    message = `This section starts at semester ${firstSupportedSemester}. The current semester is ${currentSemester}, so semester ${activeSemester} is view-only until that term starts.`;
  }

  return (
    <div
      className={`mb-4 rounded-md border border-warning/30 bg-warning/20 px-4 py-3 text-sm text-warning-foreground ${className}`.trim()}
    >
      {message}
    </div>
  );
}
