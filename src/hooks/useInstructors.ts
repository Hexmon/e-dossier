import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    listInstructors,
    getInstructorById,
    createInstructor,
    updateInstructor,
    deleteInstructor,
    Instructor,
    InstructorCreate,
    InstructorUpdate,
    ListInstructorsParams,
} from "@/app/lib/api/instructorsApi";

export function useInstructors(params?: ListInstructorsParams) {
    const queryClient = useQueryClient();

    // Query key factory
    const instructorsKey = ["instructors", params];

    // Fetch instructors list
    const {
        data: instructors = [],
        isLoading: loading,
        refetch: fetchInstructors,
    } = useQuery({
        queryKey: instructorsKey,
        queryFn: async () => {
            const data = await listInstructors(params);
            return data?.instructors || [];
        },
        staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes (instructors don't change often)
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    });

    // Create instructor mutation
    const addInstructorMutation = useMutation({
        mutationFn: (instructor: InstructorCreate) => createInstructor(instructor),
        onSuccess: (data) => {
            if (data) {
                // Invalidate and refetch instructors list
                queryClient.invalidateQueries({ queryKey: ["instructors"] });
                toast.success("Instructor created successfully");
            }
        },
        onError: (error) => {
            console.error("Error creating instructor:", error);
            toast.error("Failed to create instructor");
        },
    });

    // Update instructor mutation
    const editInstructorMutation = useMutation({
        mutationFn: ({ instructorId, updates }: { instructorId: string; updates: InstructorUpdate }) =>
            updateInstructor(instructorId, updates),
        onSuccess: (_, variables) => {
            // Invalidate both the list and the specific instructor
            queryClient.invalidateQueries({ queryKey: ["instructors"] });
            queryClient.invalidateQueries({ queryKey: ["instructor", variables.instructorId] });
            toast.success("Instructor updated successfully");
        },
        onError: (error) => {
            console.error("Error updating instructor:", error);
            toast.error("Failed to update instructor");
        },
    });

    // Delete instructor mutation
    const removeInstructorMutation = useMutation({
        mutationFn: (instructorId: string) => deleteInstructor(instructorId),
        onSuccess: (_, instructorId) => {
            // Remove from cache and refetch
            queryClient.invalidateQueries({ queryKey: ["instructors"] });
            queryClient.removeQueries({ queryKey: ["instructor", instructorId] });
            toast.success("Instructor deleted successfully");
        },
        onError: (error) => {
            console.error("Error deleting instructor:", error);
            toast.error("Failed to delete instructor");
        },
    });

    // Wrapper functions to maintain similar API
    const addInstructor = async (instructor: InstructorCreate) => {
        const result = await addInstructorMutation.mutateAsync(instructor);
        return result || null;
    };

    const editInstructor = async (instructorId: string, updates: InstructorUpdate) => {
        const result = await editInstructorMutation.mutateAsync({ instructorId, updates });
        return result || null;
    };

    const removeInstructor = async (instructorId: string) => {
        await removeInstructorMutation.mutateAsync(instructorId);
        return true;
    };

    // Helper function to fetch instructor by ID (non-hook)
    const fetchInstructorById = async (instructorId: string) => {
        const instructor = await getInstructorById(instructorId);
        return instructor || null;
    };

    return {
        loading,
        instructors,
        fetchInstructors,
        fetchInstructorById,
        addInstructor,
        editInstructor,
        removeInstructor,
        // Expose mutation states for more granular control
        isCreating: addInstructorMutation.isPending,
        isUpdating: editInstructorMutation.isPending,
        isDeleting: removeInstructorMutation.isPending,
    };
}

// Separate hook for fetching a single instructor (use this when you need reactive data)
export function useInstructor(instructorId: string) {
    return useQuery({
        queryKey: ["instructor", instructorId],
        queryFn: async () => {
            const instructor = await getInstructorById(instructorId);
            return instructor || null;
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!instructorId,
    });
}