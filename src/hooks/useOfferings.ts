import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    listOfferings,
    getOfferingById,
    createOffering,
    updateOffering,
    deleteOffering,
    Offering,
    OfferingCreate,
    OfferingUpdate,
    ListOfferingsParams,
} from "@/app/lib/api/offeringsApi";

const transformOffering = (offering: any): Offering => {
    return {
        ...offering,
        subjectId: offering.subjectId || offering.subject?.id,
        subjectCode: offering.subjectCode || offering.subject?.code,
        subjectName: offering.subjectName || offering.subject?.name,
        instructors: (offering.instructors || []).map((inst: any) => ({
            ...inst,
            instructorId: inst.instructorId || inst.instructor?.id,
            instructorName: inst.instructorName || inst.instructor?.name,
            instructorEmail: inst.instructorEmail || inst.instructor?.email,
        })),
    };
};

export function useOfferings(courseId: string, params?: ListOfferingsParams) {
    const queryClient = useQueryClient();

    // Query key factory for better cache management
    const offeringsKey = ["offerings", courseId, params];

    // Fetch offerings list
    const {
        data: offerings = [],
        isLoading: loading,
        refetch: fetchOfferings,
    } = useQuery({
        queryKey: offeringsKey,
        queryFn: async () => {
            const data = await listOfferings(courseId, params);
            return (data.offerings || []).map(transformOffering);
        },
        staleTime: 30000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (formerly cacheTime)
        enabled: !!courseId, // Only run if courseId exists
    });

    // Create offering mutation
    const addOfferingMutation = useMutation({
        mutationFn: (offering: OfferingCreate) => createOffering(courseId, offering),
        onSuccess: (data) => {
            if (data) {
                // Invalidate and refetch offerings list
                queryClient.invalidateQueries({ queryKey: ["offerings", courseId] });
                toast.success("Offering created successfully");
            }
        },
        onError: (error) => {
            console.error("Error creating offering:", error);
            toast.error("Failed to create offering");
        },
    });

    // Update offering mutation
    const editOfferingMutation = useMutation({
        mutationFn: ({ offeringId, updates }: { offeringId: string; updates: OfferingUpdate }) =>
            updateOffering(courseId, offeringId, updates),
        onSuccess: async (_, variables) => {
            // Invalidate both the list and the specific offering
            queryClient.invalidateQueries({ queryKey: ["offerings", courseId] });
            queryClient.invalidateQueries({ queryKey: ["offering", courseId, variables.offeringId] });

            toast.success("Offering updated successfully");
        },
        onError: (error) => {
            console.error("Error updating offering:", error);
            toast.error("Failed to update offering");
        },
    });

    // Delete offering mutation
    const removeOfferingMutation = useMutation({
        mutationFn: (offeringId: string) => deleteOffering(courseId, offeringId),
        onSuccess: (_, offeringId) => {
            // Remove from cache and refetch
            queryClient.invalidateQueries({ queryKey: ["offerings", courseId] });
            queryClient.removeQueries({ queryKey: ["offering", courseId, offeringId] });
            toast.success("Offering deleted successfully");
        },
        onError: (error) => {
            console.error("Error deleting offering:", error);
            toast.error("Failed to delete offering");
        },
    });

    // Wrapper functions to maintain similar API
    const addOffering = async (offering: OfferingCreate) => {
        const result = await addOfferingMutation.mutateAsync(offering);
        return result ? transformOffering(result) : null;
    };

    const editOffering = async (offeringId: string, updates: OfferingUpdate) => {
        await editOfferingMutation.mutateAsync({ offeringId, updates });
        // Fetch the updated offering
        const completeOffering = await getOfferingById(courseId, offeringId);
        return completeOffering ? transformOffering(completeOffering) : null;
    };

    const removeOffering = async (offeringId: string) => {
        await removeOfferingMutation.mutateAsync(offeringId);
        return true;
    };

    // Helper function to fetch offering by ID (non-hook)
    const fetchOfferingById = async (offeringId: string) => {
        const offering = await getOfferingById(courseId, offeringId);
        return offering ? transformOffering(offering) : null;
    };

    return {
        loading,
        offerings,
        fetchOfferings,
        fetchOfferingById,
        addOffering,
        editOffering,
        removeOffering,
        // Expose mutation states for more granular control
        isCreating: addOfferingMutation.isPending,
        isUpdating: editOfferingMutation.isPending,
        isDeleting: removeOfferingMutation.isPending,
    };
}

// Separate hook for fetching a single offering (use this when you need reactive data)
export function useOffering(courseId: string, offeringId: string) {
    return useQuery({
        queryKey: ["offering", courseId, offeringId],
        queryFn: async () => {
            const offering = await getOfferingById(courseId, offeringId);
            return offering ? transformOffering(offering) : null;
        },
        staleTime: 30000,
        enabled: !!courseId && !!offeringId,
    });
}