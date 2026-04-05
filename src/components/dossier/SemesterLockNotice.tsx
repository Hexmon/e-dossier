import React from "react";

interface SemesterLockNoticeProps {
  id?: string;
  activeSemester: number;
  currentSemester: number;
  supportedSemesters?: readonly number[];
  canOverrideLockedSemester?: boolean;
  className?: string;
}

export default function SemesterLockNotice({
  id,
  activeSemester,
  currentSemester,
  supportedSemesters = [1, 2, 3, 4, 5, 6],
  canOverrideLockedSemester = false,
  className = "",
}: SemesterLockNoticeProps) {
  if (activeSemester === currentSemester) {
    return null;
  }

  const firstSupportedSemester = supportedSemesters[0] ?? 1;

  let message = canOverrideLockedSemester
    ? activeSemester < currentSemester
      ? `Semester ${activeSemester} is historical. As super admin, edits require an override reason and the action is audited. The current semester is ${currentSemester}.`
      : `Semester ${activeSemester} is ahead of the current semester ${currentSemester}. As super admin, edits require an override reason and the action is audited.`
    : activeSemester < currentSemester
      ? `Semester ${activeSemester} is read-only. Only the current semester ${currentSemester} can be edited for this OC.`
      : `Semester ${activeSemester} is read-only until this OC reaches that semester. The current semester is ${currentSemester}.`;

  if (currentSemester < firstSupportedSemester) {
    message = canOverrideLockedSemester
      ? `This section starts at semester ${firstSupportedSemester}. The current semester is ${currentSemester}. As super admin, edits to semester ${activeSemester} require an override reason and the action is audited.`
      : `This section starts at semester ${firstSupportedSemester}. The current semester is ${currentSemester}, so semester ${activeSemester} is view-only until that term starts.`;
  }

  return (
    <div
      id={id}
      className={`mb-4 rounded-md border border-warning/30 bg-warning/20 px-4 py-3 text-sm text-warning-foreground ${className}`.trim()}
    >
      {message}
    </div>
  );
}
