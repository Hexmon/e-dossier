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

    const [active, setActive] = useState<InterviewOfficer>("plcdr");
    const { fetchInitial, saveInitial, templateMappings } = useInterviewForms(ocId);
    const hydratedRef = useRef(false);

    // Get saved form data from Redux for current officer
    const savedFormData = useSelector((state: RootState) =>
        state.initialInterview.forms[ocId]?.[active] || {}
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

            (Object.keys(data) as InterviewOfficer[]).forEach((officer) => {
                const incoming = data[officer];
                if (!incoming || Object.keys(incoming).length === 0) return;

                const existing = savedFormsRef.current?.[officer];
                const isEmpty =
                    !existing ||
                    Object.values(existing as InterviewFormData).every(
                        (value) => value === "" || value === null || value === undefined
                    );

                if (!isEmpty) return;

                dispatch(
                    saveInterviewForm({
                        ocId,
                        officer,
                        data: incoming,
                    })
                );
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
    }, [active, ocId]);

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
                        officer: active,
                        data: formData,
                    })
                );
            }
        });
        return () => subscription.unsubscribe();
    }, [form, dispatch, ocId, active]);

    async function handleSave(officer: InterviewOfficer, data: FormWrapperFields) {
        const resp = await saveInitial(officer, data);
        if (resp) {
            dispatch(clearInterviewForm({ ocId, officer }));
        }

        return resp;
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
                        className={`px-4 py-2 rounded-t-lg ${active === id ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

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

            <p className="text-sm text-muted-foreground text-center mt-4">
                * Changes are automatically saved
            </p>
        </div>
    );
}
