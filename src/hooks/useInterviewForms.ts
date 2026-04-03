"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { InterviewFormRecord, InterviewOfficer } from "@/types/interview";
import { SpecialInterviewRecord, TermVariant } from "@/store/slices/termInterviewSlice";
import { loadInterviewTemplates } from "@/lib/interviewTemplateLoader";
import { buildTemplateMappings, type TemplateMappings } from "@/lib/interviewTemplateMatching";
import { fetchOCById } from "@/app/lib/api/ocApi";
import {
    fetchInitialInterviews,
    fetchTermInterviews,
    saveInitialInterview,
    saveTermInterview,
} from "@/lib/interviewFormService";

export function useInterviewForms(ocId?: string) {
    const [loading, setLoading] = useState(false);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [templatesError, setTemplatesError] = useState<string | null>(null);
    const [templateMappings, setTemplateMappings] = useState<TemplateMappings | null>(null);
    const mappingsRef = useRef<TemplateMappings | null>(null);
    const mountedRef = useRef(true);
    const initialIndexRef = useRef<Record<string, { interviewId: string; templateId: string } | null>>({});
    const termIndexRef = useRef<
        Record<
            string,
            {
                interviewId: string;
                templateId: string;
                groupRowMap?: Record<number, string>;
            }
        >
    >({});
    const courseIdRef = useRef<string | null>(null);

    const resolveCourseId = useCallback(async () => {
        if (!ocId) throw new Error("No cadet selected");
        if (courseIdRef.current) return courseIdRef.current;
        const oc = await fetchOCById(ocId);
        const courseId = oc?.course?.id ?? null;
        if (!courseId) throw new Error("Failed to resolve cadet course");
        courseIdRef.current = courseId;
        return courseId;
    }, [ocId]);

    useEffect(() => {
        mountedRef.current = true;
        setTemplatesLoading(true);
        setTemplatesError(null);
        courseIdRef.current = null;

        if (!ocId) {
            setTemplatesLoading(false);
            return () => {
                mountedRef.current = false;
            };
        }

        resolveCourseId()
            .then((courseId) => loadInterviewTemplates(courseId))
            .then((templates) => {
                if (!mountedRef.current) return;
                const mappings = buildTemplateMappings(templates);
                mappingsRef.current = mappings;
                setTemplateMappings(mappings);
            })
            .catch((err) => {
                if (!mountedRef.current) return;
                console.error("Failed to load interview templates:", err);
                setTemplatesError(err instanceof Error ? err.message : "Failed to load templates");
            })
            .finally(() => {
                if (mountedRef.current) setTemplatesLoading(false);
            });

        return () => {
            mountedRef.current = false;
        };
    }, [ocId, resolveCourseId]);

    const ensureMappings = useCallback(async () => {
        if (mappingsRef.current) return mappingsRef.current;
        const courseId = await resolveCourseId();
        const templates = await loadInterviewTemplates(courseId);
        const mappings = buildTemplateMappings(templates);
        mappingsRef.current = mappings;
        return mappings;
    }, [resolveCourseId]);

    const fetchInitial = useCallback(async () => {
        if (!ocId) return null;
        setLoading(true);
        try {
            const mappings = await ensureMappings();
            return await fetchInitialInterviews(ocId, mappings, initialIndexRef);
        } catch (err) {
            toast.error("Failed to load initial interviews");
            console.error("Failed to load initial interviews:", err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [ocId, ensureMappings]);

    const fetchTerm = useCallback(async () => {
        if (!ocId) return null;
        setLoading(true);
        try {
            const mappings = await ensureMappings();
            return await fetchTermInterviews(ocId, mappings, termIndexRef);
        } catch (err) {
            toast.error("Failed to load term interviews");
            console.error("Failed to load term interviews:", err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [ocId, ensureMappings]);

    const saveInitial = useCallback(
        async (
            officer: InterviewOfficer,
            formData: Record<string, unknown>,
            semester?: number
        ): Promise<InterviewFormRecord | null> => {
            if (!ocId) {
                toast.error("No cadet selected");
                return null;
            }

            setLoading(true);
            try {
                const mappings = await ensureMappings();
                const interview = await saveInitialInterview(ocId, officer, formData, mappings, initialIndexRef, semester);
                if (!interview) return null;

                return {
                    officer,
                    id: interview.id,
                    ...formData,
                } as InterviewFormRecord;
            } catch (err) {
                toast.error("Failed to save interview");
                console.error("Failed to save initial interview:", err);
                return null;
            } finally {
                setLoading(false);
            }
        },
        [ocId, ensureMappings]
    );

    const saveTerm = useCallback(
        async (
            termIndex: number,
            variant: TermVariant,
            formFields: Record<string, string>,
            specialInterviews?: SpecialInterviewRecord[],
        ): Promise<InterviewFormRecord | null> => {
            if (!ocId) {
                toast.error("No cadet selected");
                return null;
            }

            setLoading(true);
            try {
                const mappings = await ensureMappings();
                const interview = await saveTermInterview(
                    ocId,
                    termIndex,
                    variant,
                    formFields,
                    specialInterviews,
                    mappings,
                    termIndexRef,
                );
                if (!interview) return null;

                return {
                    officer: "plcdr",
                    id: interview.id,
                    ...formFields,
                    specialInterviews,
                } as InterviewFormRecord;
            } catch (err) {
                toast.error("Failed to save interview");
                console.error("Failed to save term interview:", err);
                return null;
            } finally {
                setLoading(false);
            }
        },
        [ocId, ensureMappings]
    );

    return {
        loading,
        templatesLoading,
        templatesError,
        templateMappings,
        fetchInitial,
        fetchTerm,
        saveInitial,
        saveTerm,
    };
}
