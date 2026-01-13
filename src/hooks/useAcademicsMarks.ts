import { useCallback, useState } from "react";
import {
    academicsApi,
    Course,
    CourseOffering,
    OC,
    AcademicRecord,
    BulkAcademicRequest,
} from "@/app/lib/api/academicsMarksApi";

export const useAcademicsMarks = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [courseOfferings, setCourseOfferings] = useState<CourseOffering[]>([]);
    const [allOCs, setAllOCs] = useState<OC[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [loadingOfferings, setLoadingOfferings] = useState(false);
    const [loadingOCs, setLoadingOCs] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch all courses
    const fetchCourses = useCallback(async () => {
        console.log("fetchCourses called");
        setLoadingCourses(true);
        setError(null);
        try {
            console.log("Calling API...");
            const response = await academicsApi.getCourses();
            console.log("API Response:", response);
            console.log("Items from response:", response.items);
            setCourses(response.items ?? []);
        } catch (err) {
            console.error("Error fetching courses:", err);
            const message = err instanceof Error ? err.message : "Failed to fetch courses";
            setError(message);
            setCourses([]);
        } finally {
            setLoadingCourses(false);
        }
    }, []);

    // Fetch course offerings
    const fetchCourseOfferings = useCallback(async (courseId: string, semester: number) => {
        setLoadingOfferings(true);
        setError(null);
        try {
            const response = await academicsApi.getCourseOfferings(courseId, semester);
            setCourseOfferings(response.items ?? []);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to fetch subjects";
            setError(message);
            setCourseOfferings([]);
        } finally {
            setLoadingOfferings(false);
        }
    }, []);

    // Fetch all OCs
    const fetchAllOCs = useCallback(async () => {
        setLoadingOCs(true);
        setError(null);
        try {
            const response = await academicsApi.getAllOCs();
            setAllOCs(response.items ?? []);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to fetch OCs";
            setError(message);
            setAllOCs([]);
        } finally {
            setLoadingOCs(false);
        }
    }, []);

    // Get filtered OCs for a specific course
    const getFilteredOCs = useCallback((courseId: string): OC[] => {
        return allOCs.filter((oc) => oc.courseId === courseId);
    }, [allOCs]);

    // Fetch bulk academic records
    const fetchBulkAcademics = useCallback(async (ocIds: string[]): Promise<AcademicRecord[]> => {
        if (ocIds.length === 0) return [];

        setError(null);
        try {
            const response = await academicsApi.getBulkAcademics(ocIds);
            console.log("Bulk academics response:", response);

            // Transform the nested response structure into flat records
            const records: AcademicRecord[] = [];

            response.items?.forEach((ocRecord) => {
                const { ocId, data } = ocRecord;

                data?.forEach((semesterData) => {
                    const { semester, subjects } = semesterData;

                    subjects?.forEach((subjectRecord) => {
                        const { subject, theory, practical } = subjectRecord;

                        records.push({
                            ocId,
                            semester,
                            subjectId: subject.id,
                            theory,
                            practical,
                        });
                    });
                });
            });

            console.log("Transformed records:", records);
            return records;
        } catch (err) {
            console.error("Error fetching bulk academics:", err);
            const message = err instanceof Error ? err.message : "Failed to fetch academic records";
            setError(message);
            return [];
        }
    }, []);

    // Save bulk academic records
    const saveBulkAcademics = useCallback(async (request: BulkAcademicRequest): Promise<boolean> => {
        setError(null);
        try {
            await academicsApi.saveBulkAcademics(request);
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to save academic records";
            setError(message);
            return false;
        }
    }, []);

    return {
        courses,
        courseOfferings,
        allOCs,
        loadingCourses,
        loadingOfferings,
        loadingOCs,
        error,
        fetchCourses,
        fetchCourseOfferings,
        fetchAllOCs,
        getFilteredOCs,
        fetchBulkAcademics,
        saveBulkAcademics,
    };
};