"use client";
import { useState, useMemo } from "react";
import CourseSemesterSubjectFilter from "./CourseSemesterSubjectFilter";
import SubjectWiseStudentsTable from "./SubjectWiseStudentsTable";
import { useAcademicsMarks } from "@/hooks/useAcademicsMarks";

export default function ManageMarksPageContent() {
    const [courseId, setCourseId] = useState("");
    const [semester, setSemester] = useState<number | null>(null);
    const [subjectId, setSubjectId] = useState("");

    const { courses, loadingCourses, useCourseOfferings } = useAcademicsMarks();

    // Use React Query for course offerings
    const {
        data: courseOfferings = [],
        isLoading: loadingOfferings,
    } = useCourseOfferings(courseId, semester);

    // Get the selected subject's branch
    const selectedSubjectBranch = useMemo(() => {
        const offering = courseOfferings.find((co) => co.subject.id === subjectId);
        return offering?.subject.branch || null;
    }, [courseOfferings, subjectId]);

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
            />
            {courseId && semester && subjectId && (
                <SubjectWiseStudentsTable
                    courseId={courseId}
                    semester={semester}
                    subjectId={subjectId}
                    subjectBranch={selectedSubjectBranch}
                />
            )}
        </div>
    );
}