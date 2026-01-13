"use client";

import React, { useEffect, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "next/navigation";
import { RootState } from "@/store";
import { InterviewFormRecord, InterviewOfficer } from "@/types/interview";
import { useInterviewForms } from "@/hooks/useInterviewForms";
import { saveInterviewForm, clearInterviewForm } from "@/store/slices/initialInterviewSlice";

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

    const [active, setActive] = useState<InterviewOfficer>("plcdr");
    const { records, save, fetchAll, loading } = useInterviewForms([]);

    // Get saved form data from Redux for current officer
    const savedFormData = useSelector((state: RootState) =>
        state.initialInterview.forms[ocId]?.[active] || {}
    );

    const form = useForm<FormWrapperFields>({
        defaultValues: savedFormData
    });

    useEffect(() => {
        (async () => {
            await fetchAll();
        })();
    }, [fetchAll]);

    // Load saved data when switching tabs
    useEffect(() => {
        const savedData = savedFormData || {};
        form.reset(savedData);
    }, [active, ocId]);

    // Auto-save to Redux on form changes
    useEffect(() => {
        const subscription = form.watch((value) => {
            if (ocId && value) {
                const formData = Object.entries(value).reduce<Record<string, string | boolean | undefined>>(
                    (acc, [key, val]) => {
                        acc[key] = val;
                        return acc;
                    },
                    {}
                );

                dispatch(saveInterviewForm({
                    ocId,
                    officer: active,
                    data: formData
                }));
            }
        });
        return () => subscription.unsubscribe();
    }, [form.watch, dispatch, ocId, active]);

    async function onSubmitAll(data: FormWrapperFields) {
        const officer = active;
        const payload: InterviewFormRecord = {
            officer,
            ...Object.entries(data).reduce<Record<string, string>>((acc, [k, v]) => {
                if (k.startsWith(`${officer}_`)) {
                    acc[k] = (v ?? "") as string;
                }
                return acc;
            }, {}),
        };

        const resp = await save(payload);
        if (!resp) {
            console.error("Failed to save");
            return;
        }

        // Clear Redux cache after successful save
        dispatch(clearInterviewForm({ ocId, officer: active }));

        // Reset form to empty state
        form.reset({});
    }

    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearInterviewForm({ ocId, officer: active }));
            form.reset({});
        }
    };

    return (
        <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow">
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
                        className={`px-4 py-2 rounded-t-lg ${active === id
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-700"
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <form onSubmit={form.handleSubmit(onSubmitAll)}>
                <div className="space-y-6">
                    {active === "plcdr" && (
                        <PLCdrCombinedForm
                            form={form}
                            onClearForm={handleClearForm}
                        />
                    )}

                    {active === "dscoord" && (
                        <DSCoordForm
                            form={form as UseFormReturn<any>}
                            onClearForm={handleClearForm}
                        />
                    )}

                    {active === "dycdr" && (
                        <DyCdrForm
                            form={form as UseFormReturn<any>}
                            onClearForm={handleClearForm}
                        />
                    )}

                    {active === "cdr" && (
                        <CdrForm
                            form={form as UseFormReturn<any>}
                            onClearForm={handleClearForm}
                        />
                    )}
                </div>
            </form>

            {/* Auto-save indicator */}
            <p className="text-sm text-muted-foreground text-center mt-4">
                * Changes are automatically saved
            </p>
        </div>
    );
}