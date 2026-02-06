import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    academicsApi,
    Course,
    CourseOffering,
    OC,
    AcademicRecord,
    BulkAcademicRequest,
} from "@/app/lib/api/academicsMarksApi";
import { useCallback } from "react";

export const useAcademicsMarks = () => {
    const queryClient = useQueryClient();

    // Fetch all courses with React Query
    const {
        data: courses = [],
        isLoading: loadingCourses,
        error: coursesError,
    } = useQuery({
        queryKey: ["courses"],
        queryFn: async () => {
            console.log("Fetching courses...");
            const response = await academicsApi.getCourses();
            console.log("Courses response:", response.items);
            return response.items ?? [];
        },
    });

    // Fetch all OCs with React Query
    const {
        data: allOCs = [],
        isLoading: loadingOCs,
        error: ocsError,
    } = useQuery({
        queryKey: ["allOCs"],
        queryFn: async () => {
            console.log("Fetching all OCs...");
            const response = await academicsApi.getAllOCs();
            return response.items ?? [];
        },
    });

    // Fetch course offerings - this needs to be called manually
    const fetchCourseOfferings = useCallback(
        async (courseId: string, semester: number) => {
            const response = await academicsApi.getCourseOfferings(courseId, semester);
            return response.items ?? [];
        },
        []
    );

    // Hook to use course offerings
    const useCourseOfferings = (courseId: string, semester: number | null) => {
        return useQuery({
            queryKey: ["courseOfferings", courseId, semester],
            queryFn: () => fetchCourseOfferings(courseId, semester!),
            enabled: !!courseId && !!semester,
        });
    };

    // Get filtered OCs for a specific course
    const getFilteredOCs = useCallback(
        (courseId: string): OC[] => {
            return allOCs.filter((oc) => oc.courseId === courseId);
        },
        [allOCs]
    );

    // Get filtered OCs for a specific course and branch
    const getFilteredOCsByBranch = useCallback(
        (courseId: string, branch?: string | null): OC[] => {
            let filtered = allOCs.filter((oc) => oc.courseId === courseId);

            // If branch is "C" (Common), return all OCs for the course
            if (branch === "C") {
                console.log("Branch is C (Common), showing all OCs for courseId:", courseId);
                return filtered;
            }

            // Otherwise, filter by specific branch
            if (branch) {
                filtered = filtered.filter((oc) => oc.branch === branch);
            }

            return filtered;
        },
        [allOCs]
    );

    // Fetch bulk academic records
    const fetchBulkAcademics = useCallback(async (ocIds: string[]): Promise<AcademicRecord[]> => {
        if (ocIds.length === 0) return [];

        try {
            const response = await academicsApi.getBulkAcademics(ocIds);
            console.log("Bulk academics response:", response);

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
            throw err;
        }
    }, []);

    // Save bulk academic records with mutation
    const saveBulkAcademicsMutation = useMutation({
        mutationFn: async (request: BulkAcademicRequest) => {
            await academicsApi.saveBulkAcademics(request);
        },
        onSuccess: () => {
            // Optionally invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: ["bulkAcademics"] });
        },
    });

    const saveBulkAcademics = useCallback(
        async (request: BulkAcademicRequest): Promise<boolean> => {
            try {
                await saveBulkAcademicsMutation.mutateAsync(request);
                return true;
            } catch (err) {
                console.error("Error saving bulk academics:", err);
                return false;
            }
        },
        [saveBulkAcademicsMutation]
    );

    const error = coursesError || ocsError;

    return {
        courses,
        allOCs,
        loadingCourses,
        loadingOCs,
        error: error ? (error as Error).message : null,
        useCourseOfferings,
        getFilteredOCs,
        getFilteredOCsByBranch,
        fetchBulkAcademics,
        saveBulkAcademics,
    };
};