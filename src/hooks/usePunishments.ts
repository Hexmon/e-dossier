import {
    createPunishment,
    deletePunishment,
    getPunishmentById,
    Punishment,
    PunishmentCreate,
    PunishmentUpdate,
    listPunishments,
    ListPunishmentsParams,
    updatePunishment
} from "@/app/lib/api/punishmentsApi";
import { useState } from "react";
import { toast } from "sonner";

export function usePunishments() {
    const [loading, setLoading] = useState(false);
    const [punishments, setPunishments] = useState<Punishment[]>([]);

    const fetchPunishments = async (params?: ListPunishmentsParams) => {
        setLoading(true);
        try {
            const data = await listPunishments(params);
            const punishmentsList = data?.punishments || [];
            setPunishments(punishmentsList);
            return punishmentsList;
        } catch (error) {
            console.error("Error fetching punishments:", error);
            toast.error("Failed to load punishments");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const fetchPunishmentById = async (punishmentId: string) => {
        setLoading(true);
        try {
            const punishment = await getPunishmentById(punishmentId);
            return punishment || null;
        } catch (error) {
            console.error("Error fetching punishment:", error);
            toast.error("Failed to load punishment details");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const addPunishment = async (punishment: PunishmentCreate) => {
        setLoading(true);
        try {
            const newPunishment = await createPunishment(punishment);
            toast.success("Punishment created successfully");
            return newPunishment || null;
        } catch (error) {
            console.error("Error creating punishment:", error);
            toast.error("Failed to create punishment");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editPunishment = async (punishmentId: string, updates: PunishmentUpdate) => {
        setLoading(true);
        try {
            const updatedPunishment = await updatePunishment(punishmentId, updates);
            toast.success("Punishment updated successfully");
            return updatedPunishment || null;
        } catch (error) {
            console.error("Error updating punishment:", error);
            toast.error("Failed to update punishment");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removePunishment = async (punishmentId: string, hard: boolean = true) => {
        setLoading(true);
        try {
            await deletePunishment(punishmentId, hard);
            toast.success("Punishment deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting punishment:", error);
            toast.error("Failed to delete punishment");
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        punishments,
        fetchPunishments,
        fetchPunishmentById,
        addPunishment,
        editPunishment,
        removePunishment,
    };
}