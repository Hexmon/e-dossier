'use client';

import { Input } from '@/components/ui/input';
import type { Course } from '@/app/lib/api/academicsMarksApi';
import type { Platoon } from '@/app/lib/api/platoonApi';

type Props = {
    courseId: string;
    semester: number | null;
    active: boolean;
    q: string;
    platoon: string;
    courses: Course[];
    platoons: Platoon[];
    loadingCourses?: boolean;
    loadingPlatoons?: boolean;
    onCourseChange: (value: string) => void;
    onSemesterChange: (value: number | null) => void;
    onActiveChange: (value: boolean) => void;
    onQueryChange: (value: string) => void;
    onPlatoonChange: (value: string) => void;
};

export function PTBulkFilters({
    courseId,
    semester,
    active,
    q,
    platoon,
    courses,
    platoons,
    loadingCourses = false,
    loadingPlatoons = false,
    onCourseChange,
    onSemesterChange,
    onActiveChange,
    onQueryChange,
    onPlatoonChange,
}: Props) {
    return (
        <div className="grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-5">
            <select
                className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-muted/60"
                value={courseId}
                onChange={(e) => onCourseChange(e.target.value)}
                disabled={loadingCourses}
            >
                <option value="">{loadingCourses ? 'Loading courses...' : 'Select course'}</option>
                {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                        {course.code ? `${course.code} - ${course.title}` : course.title}
                    </option>
                ))}
            </select>

            <select
                className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-muted/60"
                value={semester ?? ''}
                onChange={(e) => {
                    const raw = e.target.value;
                    onSemesterChange(raw ? Number(raw) : null);
                }}
                disabled={!courseId}
            >
                <option value="">Select semester</option>
                {[1, 2, 3, 4, 5, 6].map((value) => (
                    <option key={value} value={value}>
                        Semester {value}
                    </option>
                ))}
            </select>

            <select
                className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-muted/60"
                value={platoon}
                onChange={(e) => onPlatoonChange(e.target.value)}
                disabled={loadingPlatoons}
            >
                <option value="">All platoons</option>
                {platoons.map((item) => (
                    <option key={item.id} value={item.key}>
                        {item.key} - {item.name}
                    </option>
                ))}
            </select>

            <Input
                placeholder="Search OC name / no"
                value={q}
                onChange={(e) => onQueryChange(e.target.value)}
                disabled={!courseId || !semester}
            />

            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => onActiveChange(e.target.checked)}
                />
                Active OCs only
            </label>
        </div>
    );
}
