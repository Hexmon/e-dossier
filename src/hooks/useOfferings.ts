import { useState } from "react";
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

export function useOfferings(courseId: string) {
    const [loading, setLoading] = useState(false);
    const [offerings, setOfferings] = useState<Offering[]>([]);

    const fetchOfferings = async (params?: ListOfferingsParams) => {
        setLoading(true);
        try {
            const data = await listOfferings(courseId, params);
            const offeringsList = data?.offerings || [];
            setOfferings(offeringsList);
            return offeringsList;
        } catch (error) {
            console.error("Error fetching offerings:", error);
            toast.error("Failed to load offerings");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const fetchOfferingById = async (offeringId: string) => {
        setLoading(true);
        try {
            const offering = await getOfferingById(courseId, offeringId);
            return offering || null;
        } catch (error) {
            console.error("Error fetching offering:", error);
            toast.error("Failed to load offering details");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const addOffering = async (offering: OfferingCreate) => {
        setLoading(true);
        try {
            const newOffering = await createOffering(courseId, offering);
            toast.success("Offering created successfully");
            return newOffering || null;
        } catch (error) {
            console.error("Error creating offering:", error);
            toast.error("Failed to create offering");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editOffering = async (offeringId: string, updates: OfferingUpdate) => {
        setLoading(true);
        try {
            const updatedOffering = await updateOffering(courseId, offeringId, updates);
            toast.success("Offering updated successfully");
            return updatedOffering || null;
        } catch (error) {
            console.error("Error updating offering:", error);
            toast.error("Failed to update offering");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removeOffering = async (offeringId: string) => {
        setLoading(true);
        try {
            await deleteOffering(courseId, offeringId);
            toast.success("Offering deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting offering:", error);
            toast.error("Failed to delete offering");
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        offerings,
        fetchOfferings,
        fetchOfferingById,
        addOffering,
        editOffering,
        removeOffering,
    };
}