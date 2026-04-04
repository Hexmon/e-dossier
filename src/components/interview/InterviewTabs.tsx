"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { useSelector, useDispatch } from "react-redux";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { RootState } from "@/store";
import { InterviewOfficer } from "@/types/interview";
import { useInterviewForms } from "@/hooks/useInterviewForms";
import { getTemplateMatchForSemester } from "@/lib/interviewTemplateMatching";
import { saveInterviewForm, clearInterviewForm, type InterviewFormData } from "@/store/slices/initialInterviewSlice";
import { useDossierSemesterRouting } from "@/hooks/useDossierSemesterRouting";

import DSCoordForm from "./forms/DSCoordForm";
import DyCdrForm from "./forms/DyCdrForm";
import CdrForm from "./forms/CdrForm";
import PLCdrCombinedForm from "./forms/PLCdrCombinedForm";

interface FormWrapperFields {
    [key: string]: string | boolean | undefined;
}

const EMPTY_FORM_WRAPPER_FIELDS: FormWrapperFields = {};

function buildInitialInterviewResetValues(params: {
    currentValues: FormWrapperFields;
    savedValues: FormWrapperFields;
    templateFields?: Array<{ key: string; fieldType?: string | null; groupId?: string | null }>;
}): FormWrapperFields {
    const out: FormWrapperFields = {};

    for (const key of Object.keys(params.currentValues ?? {})) {
        out[key] = "";
    }

    for (const field of params.templateFields ?? []) {
        if (field.groupId) continue;
        const type = field.fieldType?.toLowerCase?.() ?? "text";
        out[field.key] = type === "checkbox" ? false : "";
    }

    for (const [key, value] of Object.entries(params.savedValues ?? {})) {
        out[key] = value;
    }

    return out;
}

export default function InterviewTabs({
    readOnly = false,
    currentSemester = 1,
    canEditLockedSemesters = false,
}: {
    readOnly?: boolean;
    currentSemester?: number | null;
    canEditLockedSemesters?: boolean;
}) {
    const { id } = useParams();
    const searchParams = useSearchParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";
    const dispatch = useDispatch();

    const { activeSemester: selectedTerm, setActiveSemester } = useDossierSemesterRouting({
        currentSemester,
        supportedSemesters: [1, 2, 3, 4, 5, 6],
        canEditLockedSemesters,
        legacyQueryKeys: ["sem", "semister"],
    });
    const [active, setActive] = useState<InterviewOfficer>("plcdr");
    const { loading, templatesLoading, templatesError, fetchInitial, saveInitial, templateMappings } = useInterviewForms(ocId);
    const hydratedRef = useRef(false);
    const lastResetTokenRef = useRef<string>("");
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);

    const activeMatch = getTemplateMatchForSemester(templateMappings, active, selectedTerm);
    const activeTemplate = activeMatch?.template ?? null;
    const activeSemesters = activeTemplate?.semesters ?? [];
    const usesSemester = activeSemesters.length > 0;
    const semesterAllowed = !usesSemester || activeSemesters.includes(selectedTerm);
    const activeSemesterKey = String(selectedTerm);

    // Get saved form data from Redux for current officer
    const savedFormData = useSelector((state: RootState) =>
        state.initialInterview.forms[ocId]?.[activeSemesterKey]?.[active] ?? EMPTY_FORM_WRAPPER_FIELDS
    );
    const allSavedForms = useSelector((state: RootState) => state.initialInterview.forms[ocId] || {});
    const savedFormsRef = useRef(allSavedForms);
    const isHydratingRef = useRef(false);

    const form = useForm<FormWrapperFields>({
        defaultValues: savedFormData,
    });

    useEffect(() => {
        hydratedRef.current = false;
        setInitialDataLoaded(false);
    }, [ocId]);

    useEffect(() => {
        savedFormsRef.current = allSavedForms;
    }, [allSavedForms]);

    // Load existing data once on page load for this OC
    useEffect(() => {
        if (!ocId || hydratedRef.current) return;
        hydratedRef.current = true;

        (async () => {
            try {
                const data = await fetchInitial();
                if (!data) return;

                Object.entries(data).forEach(([semesterKey, officers]) => {
                    (Object.keys(officers) as InterviewOfficer[]).forEach((officer) => {
                        const incoming = officers[officer];
                        if (!incoming || Object.keys(incoming).length === 0) return;

                        const existing = savedFormsRef.current?.[semesterKey]?.[officer];
                        const isEmpty =
                            !existing ||
                            Object.values(existing as InterviewFormData).every(
                                (value) => value === "" || value === null || value === undefined
                            );

                        if (!isEmpty) return;

                        dispatch(
                            saveInterviewForm({
                                ocId,
                                semesterKey,
                                officer,
                                data: incoming,
                            })
                        );
                    });
                });
            } finally {
                setInitialDataLoaded(true);
            }
        })();
    }, [ocId, fetchInitial, dispatch]);

    // Load saved data when switching tabs
    useEffect(() => {
        isHydratingRef.current = true;
        const savedData = savedFormData || {};
        const templateFieldSeed = Array.from(activeTemplate?.fieldsByKey?.values?.() ?? [])
            .filter((field) => !field.groupId)
            .map((field) => `${field.key}:${field.fieldType ?? ""}`)
            .sort()
            .join("|");
        const resetToken = [
            ocId,
            active,
            activeSemesterKey,
            activeTemplate?.id ?? "",
            templateFieldSeed,
            JSON.stringify(savedData),
        ].join("::");

        if (lastResetTokenRef.current === resetToken) {
            isHydratingRef.current = false;
            return;
        }
        lastResetTokenRef.current = resetToken;

        const resetValues = buildInitialInterviewResetValues({
            currentValues: (form.getValues() ?? {}) as FormWrapperFields,
            savedValues: savedData as FormWrapperFields,
            templateFields: Array.from(activeTemplate?.fieldsByKey?.values?.() ?? []),
        });
        form.reset(resetValues);
        queueMicrotask(() => {
            isHydratingRef.current = false;
        });
    }, [active, ocId, activeSemesterKey, activeTemplate, savedFormData]);

    // Auto-save unsaved changes to Redux
    useEffect(() => {
        const subscription = form.watch((value) => {
            if (isHydratingRef.current) return;
            if (ocId && value) {
                const formData = Object.entries(value).reduce<Record<string, string | boolean | undefined>>(
                    (acc, [key, val]) => {
                        acc[key] = val;
                        return acc;
                    },
                    {}
                );

                dispatch(
                    saveInterviewForm({
                        ocId,
                        semesterKey: activeSemesterKey,
                        officer: active,
                        data: formData,
                    })
                );
            }
        });
        return () => subscription.unsubscribe();
    }, [form, dispatch, ocId, active, activeSemesterKey]);

    async function handleSave(officer: InterviewOfficer, data: FormWrapperFields) {
        if (readOnly) return null;
        if (usesSemester && !semesterAllowed) return null;
        const resp = await saveInitial(officer, data, selectedTerm);
        if (resp) {
            dispatch(clearInterviewForm({ ocId, semesterKey: activeSemesterKey, officer }));
        }

        return resp;
    }

    const handleClearForm = () => {
        if (readOnly) return;
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearInterviewForm({ ocId, semesterKey: activeSemesterKey, officer: active }));
            form.reset({});
        }
    };

    const termTabs = [1, 2, 3, 4, 5, 6];
    const termLabels: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI" };
    const isInitialLoading = templatesLoading || (!initialDataLoaded && loading);

    return (
        <div className="max-w-5xl mx-auto bg-card p-6 rounded-lg shadow">
            <div className="flex justify-center items-center gap-2 mb-4">
                {termTabs.map((term) => {
                    const label = termLabels[term] ?? "";
                    const isActive = selectedTerm === term;

                    return (
                        <button
                            key={term}
                            type="button"
                            onClick={() => setActiveSemester(term)}
                            className={`px-4 py-2 rounded-t-lg ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                        >
                            {`TERM ${label}`}
                        </button>
                    );
                })}
            </div>

            <div className="flex justify-center items-center gap-2 mb-4">
                {[
                    { id: "plcdr", label: "PL CDR" },
                    { id: "dscoord", label: "DS COORD" },
                    { id: "dycdr", label: "DY CDR" },
                    { id: "cdr", label: "CDR" },
                ].map(({ id, label }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setActive(id as InterviewOfficer)}
                        className={`px-4 py-2 rounded-t-lg ${active === id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {isInitialLoading ? (
                <div className="border rounded-lg p-6 bg-muted/40 text-center text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3"></div>
                    Loading interview templates and saved interview data...
                </div>
            ) : templatesError ? (
                <div className="border rounded-lg p-6 bg-muted/40 text-center text-sm text-destructive">
                    Failed to load interview templates. {templatesError}
                </div>
            ) : semesterAllowed ? (
                <div className={readOnly ? "pointer-events-none opacity-80" : ""}>
                <form onSubmit={form.handleSubmit((data) => handleSave(active, data))}>
                    <div className="space-y-6">
                        {active === "plcdr" && (
                            <PLCdrCombinedForm
                                key={`${ocId}:plcdr:${activeSemesterKey}`}
                                form={form}
                                template={getTemplateMatchForSemester(templateMappings, "plcdr", selectedTerm)?.template ?? null}
                                onClearForm={handleClearForm}
                                onSave={(data) => handleSave("plcdr", data)}
                            />
                        )}

                        {active === "dscoord" && (
                            <DSCoordForm
                                key={`${ocId}:dscoord:${activeSemesterKey}`}
                                form={form as UseFormReturn<any>}
                                template={getTemplateMatchForSemester(templateMappings, "dscoord", selectedTerm)?.template ?? null}
                                onClearForm={handleClearForm}
                                onSave={(data) => handleSave("dscoord", data)}
                            />
                        )}

                        {active === "dycdr" && (
                            <DyCdrForm
                                key={`${ocId}:dycdr:${activeSemesterKey}`}
                                form={form as UseFormReturn<any>}
                                template={getTemplateMatchForSemester(templateMappings, "dycdr", selectedTerm)?.template ?? null}
                                onClearForm={handleClearForm}
                                onSave={(data) => handleSave("dycdr", data)}
                            />
                        )}

                        {active === "cdr" && (
                            <CdrForm
                                key={`${ocId}:cdr:${activeSemesterKey}`}
                                form={form as UseFormReturn<any>}
                                template={getTemplateMatchForSemester(templateMappings, "cdr", selectedTerm)?.template ?? null}
                                onClearForm={handleClearForm}
                                onSave={(data) => handleSave("cdr", data)}
                            />
                        )}
                    </div>
                </form>
                </div>
            ) : (
                <div className="border rounded-lg p-6 bg-muted/40 text-center text-sm text-muted-foreground">
                    The selected interview template is not configured for this term.
                </div>
            )}

            <p className="text-sm text-muted-foreground text-center mt-4">
                * Changes are automatically saved
            </p>
        </div>
    );
}
