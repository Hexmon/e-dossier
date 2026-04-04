"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import CourseSemesterSubjectFilter from "./CourseSemesterSubjectFilter";
import SubjectWiseStudentsTable from "./SubjectWiseStudentsTable";
import { useAcademicsMarks } from "@/hooks/useAcademicsMarks";

export default function ManageMarksPageContent() {
    const searchParams = useSearchParams();
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

    useEffect(() => {
        const nextCourseId = searchParams.get("courseId") ?? "";
        const nextSemesterRaw = searchParams.get("semester");
        const nextSubjectId = searchParams.get("subjectId") ?? "";
        const nextSemester = nextSemesterRaw ? Number(nextSemesterRaw) : null;

        setCourseId(nextCourseId);
        setSemester(nextSemester && Number.isFinite(nextSemester) ? nextSemester : null);
        setSubjectId(nextSubjectId);
    }, [searchParams]);

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
