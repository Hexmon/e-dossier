import { useState } from "react";
import { toast } from "sonner";
import {
    getPTTemplate,
    listPTTypes,
    createPTType,
    updatePTType,
    deletePTType,
    createPTAttempt,
    updatePTAttempt,
    deletePTAttempt,
    createPTGrade,
    updatePTGrade,
    deletePTGrade,
    createPTTask,
    updatePTTask,
    deletePTTask,
    createPTTaskScore,
    updatePTTaskScore,
    deletePTTaskScore,
    listPTMotivationFields,
    createPTMotivationField,
    updatePTMotivationField,
    deletePTMotivationField,
    PTTemplate,
    PTType,
    PTTypeCreate,
    PTTypeUpdate,
    PTAttemptCreate,
    PTAttemptUpdate,
    PTGradeCreate,
    PTGradeUpdate,
    PTTaskCreate,
    PTTaskUpdate,
    PTTaskScoreCreate,
    PTTaskScoreUpdate,
    PTMotivationField,
    PTMotivationFieldCreate,
    PTMotivationFieldUpdate,
    DeleteOptions,
} from "@/app/lib/api/Physicaltrainingapi";

export function usePhysicalTrainingMgmt() {
    const [loading, setLoading] = useState(false);
    const [template, setTemplate] = useState<PTTemplate | null>(null);
    const [types, setTypes] = useState<PTType[]>([]);
    const [motivationFields, setMotivationFields] = useState<PTMotivationField[]>([]);

    // ========================================================================
    // TEMPLATE
    // ========================================================================
    const fetchTemplate = async (semester: number) => {
        setLoading(true);
        try {
            const data = await getPTTemplate(semester);
            setTemplate(data);
            return data;
        } catch (error) {
            console.error("Error fetching PT template:", error);
            toast.error("Failed to load PT template");
            return null;
        } finally {
            setLoading(false);
        }
    };

    // ========================================================================
    // PT TYPES
    // ========================================================================
    const fetchTypes = async (semester: number) => {
        setLoading(true);
        try {
            const data = await listPTTypes(semester);
            const typesList = data?.items || [];
            setTypes(typesList);
            return typesList;
        } catch (error) {
            console.error("Error fetching PT types:", error);
            toast.error("Failed to load PT types");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const addType = async (payload: PTTypeCreate) => {
        setLoading(true);
        try {
            const newType = await createPTType(payload);
            toast.success("PT Type created successfully");
            return newType;
        } catch (error) {
            console.error("Error creating PT type:", error);
            toast.error("Failed to create PT type");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editType = async (typeId: string, updates: PTTypeUpdate) => {
        setLoading(true);
        try {
            const updatedType = await updatePTType(typeId, updates);
            toast.success("PT Type updated successfully");
            return updatedType;
        } catch (error) {
            console.error("Error updating PT type:", error);
            toast.error("Failed to update PT type");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removeType = async (typeId: string, options?: DeleteOptions) => {
        setLoading(true);
        try {
            await deletePTType(typeId, options);
            toast.success("PT Type deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting PT type:", error);
            toast.error("Failed to delete PT type");
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ========================================================================
    // PT ATTEMPTS
    // ========================================================================
    const addAttempt = async (typeId: string, payload: PTAttemptCreate) => {
        setLoading(true);
        try {
            const newAttempt = await createPTAttempt(typeId, payload);
            toast.success("Attempt created successfully");
            return newAttempt;
        } catch (error) {
            console.error("Error creating attempt:", error);
            toast.error("Failed to create attempt");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editAttempt = async (typeId: string, attemptId: string, updates: PTAttemptUpdate) => {
        setLoading(true);
        try {
            const updatedAttempt = await updatePTAttempt(typeId, attemptId, updates);
            toast.success("Attempt updated successfully");
            return updatedAttempt;
        } catch (error) {
            console.error("Error updating attempt:", error);
            toast.error("Failed to update attempt");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removeAttempt = async (typeId: string, attemptId: string, options?: DeleteOptions) => {
        setLoading(true);
        try {
            await deletePTAttempt(typeId, attemptId, options);
            toast.success("Attempt deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting attempt:", error);
            toast.error("Failed to delete attempt");
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ========================================================================
    // PT GRADES
    // ========================================================================
    const addGrade = async (typeId: string, attemptId: string, payload: PTGradeCreate) => {
        setLoading(true);
        try {
            const newGrade = await createPTGrade(typeId, attemptId, payload);
            toast.success("Grade created successfully");
            return newGrade;
        } catch (error) {
            console.error("Error creating grade:", error);
            toast.error("Failed to create grade");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editGrade = async (
        typeId: string,
        attemptId: string,
        gradeId: string,
        updates: PTGradeUpdate
    ) => {
        setLoading(true);
        try {
            const updatedGrade = await updatePTGrade(typeId, attemptId, gradeId, updates);
            toast.success("Grade updated successfully");
            return updatedGrade;
        } catch (error) {
            console.error("Error updating grade:", error);
            toast.error("Failed to update grade");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removeGrade = async (
        typeId: string,
        attemptId: string,
        gradeId: string,
        options?: DeleteOptions
    ) => {
        setLoading(true);
        try {
            await deletePTGrade(typeId, attemptId, gradeId, options);
            toast.success("Grade deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting grade:", error);
            toast.error("Failed to delete grade");
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ========================================================================
    // PT TASKS
    // ========================================================================
    const addTask = async (typeId: string, payload: PTTaskCreate) => {
        setLoading(true);
        try {
            const newTask = await createPTTask(typeId, payload);
            toast.success("Task created successfully");
            return newTask;
        } catch (error) {
            console.error("Error creating task:", error);
            toast.error("Failed to create task");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editTask = async (typeId: string, taskId: string, updates: PTTaskUpdate) => {
        setLoading(true);
        try {
            const updatedTask = await updatePTTask(typeId, taskId, updates);
            toast.success("Task updated successfully");
            return updatedTask;
        } catch (error) {
            console.error("Error updating task:", error);
            toast.error("Failed to update task");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removeTask = async (typeId: string, taskId: string, options?: DeleteOptions) => {
        setLoading(true);
        try {
            await deletePTTask(typeId, taskId, options);
            toast.success("Task deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting task:", error);
            toast.error("Failed to delete task");
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ========================================================================
    // PT TASK SCORES
    // ========================================================================
    const addTaskScore = async (typeId: string, taskId: string, payload: PTTaskScoreCreate) => {
        setLoading(true);
        try {
            const newScore = await createPTTaskScore(typeId, taskId, payload);
            toast.success("Task score created successfully");
            return newScore;
        } catch (error) {
            console.error("Error creating task score:", error);
            toast.error("Failed to create task score");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editTaskScore = async (
        typeId: string,
        taskId: string,
        scoreId: string,
        updates: PTTaskScoreUpdate
    ) => {
        setLoading(true);
        try {
            const updatedScore = await updatePTTaskScore(typeId, taskId, scoreId, updates);
            toast.success("Task score updated successfully");
            return updatedScore;
        } catch (error) {
            console.error("Error updating task score:", error);
            toast.error("Failed to update task score");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removeTaskScore = async (typeId: string, taskId: string, scoreId: string) => {
        setLoading(true);
        try {
            await deletePTTaskScore(typeId, taskId, scoreId);
            toast.success("Task score deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting task score:", error);
            toast.error("Failed to delete task score");
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ========================================================================
    // MOTIVATION FIELDS
    // ========================================================================
    const fetchMotivationFields = async (semester: number) => {
        setLoading(true);
        try {
            const data = await listPTMotivationFields(semester);
            const fieldsList = data?.items || [];
            setMotivationFields(fieldsList);
            return fieldsList;
        } catch (error) {
            console.error("Error fetching motivation fields:", error);
            toast.error("Failed to load motivation fields");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const addMotivationField = async (payload: PTMotivationFieldCreate) => {
        setLoading(true);
        try {
            const newField = await createPTMotivationField(payload);
            toast.success("Motivation field created successfully");
            return newField;
        } catch (error) {
            console.error("Error creating motivation field:", error);
            toast.error("Failed to create motivation field");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editMotivationField = async (fieldId: string, updates: PTMotivationFieldUpdate) => {
        setLoading(true);
        try {
            const updatedField = await updatePTMotivationField(fieldId, updates);
            toast.success("Motivation field updated successfully");
            return updatedField;
        } catch (error) {
            console.error("Error updating motivation field:", error);
            toast.error("Failed to update motivation field");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removeMotivationField = async (fieldId: string, options?: DeleteOptions) => {
        setLoading(true);
        try {
            await deletePTMotivationField(fieldId, options);
            toast.success("Motivation field deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting motivation field:", error);
            toast.error("Failed to delete motivation field");
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        template,
        types,
        motivationFields,
        // Template
        fetchTemplate,
        // Types
        fetchTypes,
        addType,
        editType,
        removeType,
        // Attempts
        addAttempt,
        editAttempt,
        removeAttempt,
        // Grades
        addGrade,
        editGrade,
        removeGrade,
        // Tasks
        addTask,
        editTask,
        removeTask,
        // Task Scores
        addTaskScore,
        editTaskScore,
        removeTaskScore,
        // Motivation Fields
        fetchMotivationFields,
        addMotivationField,
        editMotivationField,
        removeMotivationField,
    };
}