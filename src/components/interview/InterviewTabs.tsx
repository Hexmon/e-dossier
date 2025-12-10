"use client";

import React, { useEffect, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { InterviewFormRecord, InterviewOfficer } from "@/types/interview";
import { useInterviewForms } from "@/hooks/useInterviewForms";

import DSCoordForm from "./forms/DSCoordForm";
import DyCdrForm from "./forms/DyCdrForm";
import CdrForm from "./forms/CdrForm";
import PLCdrCombinedForm from "./forms/PLCdrCombinedForm";

interface FormWrapperFields {
    // flexible shape: keys will be officer-prefixed (e.g. plcdr_appearance)
    [key: string]: string | boolean | undefined;
}

export default function InterviewTabs() {
    const [active, setActive] = useState<InterviewOfficer>("plcdr");
    const { records, save, fetchAll, loading } = useInterviewForms([]);
    const form = useForm<FormWrapperFields>({ defaultValues: {} });

    useEffect(() => {
        (async () => {
            await fetchAll();
        })();
    }, [fetchAll]);

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

        const keep = Object.fromEntries(
            Object.keys(form.getValues()).map((k) => [k, form.getValues()[k] ?? ""])
        );
        form.reset(keep);
    }

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

            <form onSubmit={form.handleSubmit(onSubmitAll)}>
                <div className="space-y-6">
                    {active === "plcdr" && (
                        <>
                        <PLCdrCombinedForm form={form} />
                        </>
                    )}

                    {active === "dscoord" && <DSCoordForm form={form as UseFormReturn<any>} />}

                    {active === "dycdr" && <DyCdrForm form={form as UseFormReturn<any>} />}

                    {active === "cdr" && <CdrForm form={form as UseFormReturn<any>} />}
                </div>

                <div className="flex justify-center gap-3 mt-6">
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded">Save</button>
                    <button
                        type="button"
                        onClick={() => form.reset()}
                        className="px-6 py-2 bg-gray-200 rounded"
                    >
                        Reset
                    </button>
                </div>
            </form>

            <div className="mt-6 text-sm text-muted-foreground">
                {loading ? <p>Saving / Loading...</p> : <p>Saved records: {records.length}</p>}
            </div>
        </div>
    );
}
