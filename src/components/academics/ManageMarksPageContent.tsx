"use client";

import { useState } from "react";
import CourseSemesterSubjectFilter from "./CourseSemesterSubjectFilter";
import SubjectWiseStudentsTable from "./SubjectWiseStudentsTable";
import { useAcademics } from "@/hooks/useAcademics";
import { useAcademicsMarks } from "@/hooks/useAcademicsMarks";

export default function ManageMarksPageContent() {
    const [courseId, setCourseId] = useState("");
    const [semester, setSemester] = useState<number | null>(null);
    const [subjectId, setSubjectId] = useState("");

    const {
        courses,
        courseOfferings,
        loadingCourses,
        loadingOfferings,
        fetchCourses,
        fetchCourseOfferings,
    } = useAcademicsMarks();

    const handleCourseChange = (value: string) => {
        setCourseId(value);
        setSemester(null);
        setSubjectId("");
    };

    const handleSemesterChange = (value: number) => {
        setSemester(value);
        setSubjectId("");
    };

    return (
        <div className="space-y-6">
            <CourseSemesterSubjectFilter
                courseId={courseId}
                semester={semester}
                subjectId={subjectId}
                courses={courses}
                courseOfferings={courseOfferings}
                loadingCourses={loadingCourses}
                loadingOfferings={loadingOfferings}
                onCourseChange={handleCourseChange}
                onSemesterChange={handleSemesterChange}
                onSubjectChange={setSubjectId}
                onFetchCourses={fetchCourses}
                onFetchOfferings={fetchCourseOfferings}
            />

            {courseId && semester && subjectId && (
                <SubjectWiseStudentsTable
                    courseId={courseId}
                    semester={semester}
                    subjectId={subjectId}
                />
            )}
        </div>
    );
}