"use client";

import { useEffect } from "react";
import { Course, CourseOffering } from "@/app/lib/api/academicsMarksApi";

interface Props {
    courseId: string;
    semester: number | null;
    subjectId: string;
    courses?: Course[];
    courseOfferings?: CourseOffering[];
    loadingCourses?: boolean;
    loadingOfferings?: boolean;
    onCourseChange: (v: string) => void;
    onSemesterChange: (v: number) => void;
    onSubjectChange: (v: string) => void;
    onFetchCourses: () => void;
    onFetchOfferings: (courseId: string, semester: number) => void;
}

export default function CourseSemesterSubjectFilter({
    courseId,
    semester,
    subjectId,
    courses = [],
    courseOfferings = [],
    loadingCourses = false,
    loadingOfferings = false,
    onCourseChange,
    onSemesterChange,
    onSubjectChange,
    onFetchCourses,
    onFetchOfferings,
}: Props) {
    // Fetch courses on mount - only once
    useEffect(() => {
        if (courses.length === 0 && !loadingCourses) {
            console.log("Triggering fetch courses...");
            onFetchCourses();
        }
    }, []);

    // Debug: Log when courses update
    useEffect(() => {
        console.log("Courses updated:", courses);
    }, [courses]);

    // Fetch offerings when course and semester change
    useEffect(() => {
        if (courseId && semester) {
            onFetchOfferings(courseId, semester);
        }
    }, [courseId, semester, onFetchOfferings]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
                className="border px-3 py-2 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
                value={courseId}
                onChange={(e) => onCourseChange(e.target.value)}
                disabled={loadingCourses}
            >
                <option value="">
                    {loadingCourses ? "Loading courses..." : "Select Course"}
                </option>
                {(courses ?? []).map((course) => {
                    const { id, title, code } = course;
                    return (
                        <option key={id} value={id}>
                            {code ? `${code} - ${title}` : title}
                        </option>
                    );
                })}
            </select>

            <select
                className="border px-3 py-2 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
                value={semester ?? ""}
                disabled={!courseId}
                onChange={(e) => onSemesterChange(Number(e.target.value))}
            >
                <option value="">Select Semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                        Semester {s}
                    </option>
                ))}
            </select>

            <select
                className="border px-3 py-2 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
                value={subjectId}
                disabled={!semester || loadingOfferings}
                onChange={(e) => onSubjectChange(e.target.value)}
            >
                <option value="">
                    {loadingOfferings ? "Loading subjects..." : "Select Subject"}
                </option>
                {(courseOfferings ?? []).map((offering) => {
                    const { id, subject } = offering;
                    const { name, code } = subject;
                    return (
                        <option key={id} value={subject.id}>
                            {code ? `${code} - ${name}` : name}
                        </option>
                    );
                })}
            </select>
        </div>
    );
}