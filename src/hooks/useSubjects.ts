import { useState } from "react";
import { toast } from "sonner";
import {
    listSubjects,
    getSubjectById,
    createSubject,
    updateSubject,
    deleteSubject,
    Subject,
    SubjectCreate,
    SubjectUpdate,
    ListSubjectsParams,
} from "@/app/lib/api/subjectsApi";

export function useSubjects() {
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    const fetchSubjects = async (params?: ListSubjectsParams) => {
        setLoading(true);
        try {
            const data = await listSubjects(params);
            const subjectsList = data?.subjects || [];
            setSubjects(subjectsList);
            return subjectsList;
        } catch (error) {
            console.error("Error fetching subjects:", error);
            toast.error("Failed to load subjects");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjectById = async (subjectId: string) => {
        setLoading(true);
        try {
            const subject = await getSubjectById(subjectId);
            return subject || null;
        } catch (error) {
            console.error("Error fetching subject:", error);
            toast.error("Failed to load subject details");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const addSubject = async (subject: SubjectCreate) => {
        setLoading(true);
        try {
            const newSubject = await createSubject(subject);
            toast.success("Subject created successfully");
            return newSubject || null;
        } catch (error) {
            console.error("Error creating subject:", error);
            toast.error("Failed to create subject");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editSubject = async (subjectId: string, updates: SubjectUpdate) => {
        setLoading(true);
        try {
            const updatedSubject = await updateSubject(subjectId, updates);
            toast.success("Subject updated successfully");
            return updatedSubject || null;
        } catch (error) {
            console.error("Error updating subject:", error);
            toast.error("Failed to update subject");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removeSubject = async (subjectId: string) => {
        setLoading(true);
        try {
            await deleteSubject(subjectId);
            toast.success("Subject deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting subject:", error);
            toast.error("Failed to delete subject");
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        subjects,
        fetchSubjects,
        fetchSubjectById,
        addSubject,
        editSubject,
        removeSubject,
    };
}