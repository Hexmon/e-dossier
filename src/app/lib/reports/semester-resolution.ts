import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/app/db/client';
import { courses } from '@/app/db/schema/training/courses';
import { courseOfferings } from '@/app/db/schema/training/courseOfferings';
import { ApiError } from '@/app/lib/http';

export async function resolveCourseWithSemesters(courseId: string) {
  const [row] = await db
    .select({
      id: courses.id,
      code: courses.code,
      title: courses.title,
      currentSemester: sql<number | null>`MAX(${courseOfferings.semester})`,
    })
    .from(courses)
    .leftJoin(
      courseOfferings,
      and(eq(courseOfferings.courseId, courses.id), isNull(courseOfferings.deletedAt))
    )
    .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)))
    .groupBy(courses.id, courses.code, courses.title)
    .limit(1);

  if (!row) {
    throw new ApiError(404, 'Course not found.', 'not_found', { courseId });
  }

  const currentSemester = Math.max(1, Math.min(Number(row.currentSemester ?? 1), 6));
  const allowedSemesters = Array.from({ length: currentSemester }, (_, i) => i + 1);

  return {
    id: row.id,
    code: row.code,
    title: row.title,
    currentSemester,
    allowedSemesters,
  };
}

export function assertSemesterAllowed(semester: number, allowedSemesters: number[]) {
  if (!allowedSemesters.includes(semester)) {
    throw new ApiError(400, 'Semester is not allowed for selected course.', 'bad_request', {
      semester,
      allowedSemesters,
    });
  }
}
