"use client";

import { useState, useCallback } from "react";
import {
    listSemesters,
    getSemesterById,
    updateSemesterGPA as updateSemesterGPAApi,
    updateSubjectMarks as updateSubjectMarksApi,
    deleteSemester as deleteSemesterApi,
    deleteSubject as deleteSubjectApi,
    SemesterData,
    SubjectMarks,
    SemesterGPAUpdate,
} from "@/app/lib/api/academics";

export function useAcademics(ocId: string) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getSemesterList = useCallback(
        async (semester?: number): Promise<SemesterData[]> => {
            setLoading(true);
            setError(null);
            try {
                const { semesters } = await listSemesters(ocId, { semester });
                return semesters;
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                setError(message);
                return [];
            } finally {
                setLoading(false);
            }
        },
        [ocId]
    );

    const getSpecificSemester = useCallback(
        async (semester: number): Promise<SemesterData | null> => {
            setLoading(true);
            setError(null);
            try {
                const response = await getSemesterById(ocId, semester);
                // Handle both direct and nested response structures
                const data = (response as any).data || response;
                return data;
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                setError(message);
                return null;
            } finally {
                setLoading(false);
            }
        },
        [ocId]
    );

    const updateSemesterGPA = useCallback(
        async (semester: number, data: SemesterGPAUpdate): Promise<boolean> => {
            setLoading(true);
            setError(null);
            try {
                await updateSemesterGPAApi(ocId, semester, data);
                return true;
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                setError(message);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [ocId]
    );

    const updateSubjectMarks = useCallback(
        async (
            semester: number,
            subjectId: string,
            marks: SubjectMarks
        ): Promise<boolean> => {
            setLoading(true);
            setError(null);
            try {
                await updateSubjectMarksApi(ocId, semester, subjectId, marks);
                return true;
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                setError(message);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [ocId]
    );

    const deleteSemester = useCallback(
        async (semester: number): Promise<boolean> => {
            setLoading(true);
            setError(null);
            try {
                await deleteSemesterApi(ocId, semester);
                return true;
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                setError(message);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [ocId]
    );

    const deleteSubject = useCallback(
        async (semester: number, subjectId: string): Promise<boolean> => {
            setLoading(true);
            setError(null);
            try {
                await deleteSubjectApi(ocId, semester, subjectId);
                return true;
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                setError(message);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [ocId]
    );

    return {
        loading,
        error,
        getSemesterList,
        getSpecificSemester,
        updateSemesterGPA,
        updateSubjectMarks,
        deleteSemester,
        deleteSubject,
    };
}

export type { SemesterData, SubjectMarks, SemesterGPAUpdate };