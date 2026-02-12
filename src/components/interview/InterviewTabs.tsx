"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "next/navigation";
import { RootState } from "@/store";
import { InterviewOfficer } from "@/types/interview";
import { useInterviewForms } from "@/hooks/useInterviewForms";
import { saveInterviewForm, clearInterviewForm, type InterviewFormData } from "@/store/slices/initialInterviewSlice";

import DSCoordForm from "./forms/DSCoordForm";
import DyCdrForm from "./forms/DyCdrForm";
import CdrForm from "./forms/CdrForm";
import PLCdrCombinedForm from "./forms/PLCdrCombinedForm";

interface FormWrapperFields {
    [key: string]: string | boolean | undefined;
}

export default function InterviewTabs() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";
    const dispatch = useDispatch();

    const [selectedTerm, setSelectedTerm] = useState<number>(1);
    const [active, setActive] = useState<InterviewOfficer>("plcdr");
    const { fetchInitial, saveInitial, templateMappings } = useInterviewForms(ocId);
    const hydratedRef = useRef(false);

    const activeTemplate = templateMappings?.byKind[active]?.template ?? null;
    const activeSemesters = activeTemplate?.semesters ?? [];
    const usesSemester = activeSemesters.length > 0;
    const semesterAllowed = !usesSemester || activeSemesters.includes(selectedTerm);
    const activeSemesterKey = usesSemester ? String(selectedTerm) : "none";

    // Get saved form data from Redux for current officer
    const savedFormData = useSelector((state: RootState) =>
        state.initialInterview.forms[ocId]?.[activeSemesterKey]?.[active] || {}
    );
    const allSavedForms = useSelector((state: RootState) => state.initialInterview.forms[ocId] || {});
    const savedFormsRef = useRef(allSavedForms);
    const isHydratingRef = useRef(false);

    const form = useForm<FormWrapperFields>({
        defaultValues: savedFormData,
    });

    useEffect(() => {
        hydratedRef.current = false;
    }, [ocId]);

    useEffect(() => {
        savedFormsRef.current = allSavedForms;
    }, [allSavedForms]);

    // Load existing data once on page load for this OC
    useEffect(() => {
        if (!ocId || hydratedRef.current) return;
        hydratedRef.current = true;

        (async () => {
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
        })();
    }, [ocId, fetchInitial, dispatch]);

    // Load saved data when switching tabs
    useEffect(() => {
        isHydratingRef.current = true;
        const savedData = savedFormData || {};
        form.reset(savedData);
        queueMicrotask(() => {
            isHydratingRef.current = false;
        });
    }, [active, ocId, activeSemesterKey]);

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
        if (usesSemester && !semesterAllowed) return null;
        const resp = await saveInitial(officer, data, usesSemester ? selectedTerm : undefined);
        if (resp) {
            dispatch(clearInterviewForm({ ocId, semesterKey: activeSemesterKey, officer }));
        }

        return resp;
    }

    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearInterviewForm({ ocId, semesterKey: activeSemesterKey, officer: active }));
            form.reset({});
        }
    };

    const termTabs = [1, 2, 3, 4, 5, 6];
    const termLabels: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI" };

    return (
        <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow">
            <div className="flex justify-center items-center gap-2 mb-4">
                {termTabs.map((term) => {
                    const label = termLabels[term] ?? "";
                    const isActive = selectedTerm === term;

                    return (
                        <button
                            key={term}
                            type="button"
                            onClick={() => setSelectedTerm(term)}
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

            {semesterAllowed ? (
                <form onSubmit={form.handleSubmit((data) => handleSave(active, data))}>
                    <div className="space-y-6">
                        {active === "plcdr" && (
                            <PLCdrCombinedForm
                                form={form}
                                template={templateMappings?.byKind.plcdr?.template ?? null}
                                onClearForm={handleClearForm}
                                onSave={(data) => handleSave("plcdr", data)}
                            />
                        )}

                        {active === "dscoord" && (
                            <DSCoordForm
                                form={form as UseFormReturn<any>}
                                template={templateMappings?.byKind.dscoord?.template ?? null}
                                onClearForm={handleClearForm}
                                onSave={(data) => handleSave("dscoord", data)}
                            />
                        )}

                        {active === "dycdr" && (
                            <DyCdrForm
                                form={form as UseFormReturn<any>}
                                template={templateMappings?.byKind.dycdr?.template ?? null}
                                onClearForm={handleClearForm}
                                onSave={(data) => handleSave("dycdr", data)}
                            />
                        )}

                        {active === "cdr" && (
                            <CdrForm
                                form={form as UseFormReturn<any>}
                                template={templateMappings?.byKind.cdr?.template ?? null}
                                onClearForm={handleClearForm}
                                onSave={(data) => handleSave("cdr", data)}
                            />
                        )}
                    </div>
                </form>
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
