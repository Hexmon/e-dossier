import { createInstructor, deleteInstructor, getInstructorById, Instructor, InstructorCreate, InstructorUpdate, listInstructors, ListInstructorsParams, updateInstructor } from "@/app/lib/api/instructorsApi";
import { useState } from "react";
import { toast } from "sonner";

export function useInstructors() {
    const [loading, setLoading] = useState(false);
    const [instructors, setInstructors] = useState<Instructor[]>([]);

    const fetchInstructors = async (params?: ListInstructorsParams) => {
        setLoading(true);
        try {
            const data = await listInstructors(params);
            const instructorsList = data?.instructors || [];
            setInstructors(instructorsList);
            return instructorsList;
        } catch (error) {
            console.error("Error fetching instructors:", error);
            toast.error("Failed to load instructors");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const fetchInstructorById = async (instructorId: string) => {
        setLoading(true);
        try {
            const instructor = await getInstructorById(instructorId);
            return instructor || null;
        } catch (error) {
            console.error("Error fetching instructor:", error);
            toast.error("Failed to load instructor details");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const addInstructor = async (instructor: InstructorCreate) => {
        setLoading(true);
        try {
            const newInstructor = await createInstructor(instructor);
            toast.success("Instructor created successfully");
            return newInstructor || null;
        } catch (error) {
            console.error("Error creating instructor:", error);
            toast.error("Failed to create instructor");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editInstructor = async (instructorId: string, updates: InstructorUpdate) => {
        setLoading(true);
        try {
            const updatedInstructor = await updateInstructor(instructorId, updates);
            toast.success("Instructor updated successfully");
            return updatedInstructor || null;
        } catch (error) {
            console.error("Error updating instructor:", error);
            toast.error("Failed to update instructor");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removeInstructor = async (instructorId: string) => {
        setLoading(true);
        try {
            await deleteInstructor(instructorId);
            toast.success("Instructor deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting instructor:", error);
            toast.error("Failed to delete instructor");
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        instructors,
        fetchInstructors,
        fetchInstructorById,
        addInstructor,
        editInstructor,
        removeInstructor,
    };
}