"use client";

import React, { useEffect, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import TermSubForm from "./TermSubForm";
import { useInterviewForms } from "@/hooks/useInterviewForms";
import { beginningFields, postMidFields, specialFields } from "@/types/interview-term";

type TermVariant = "beginning" | "postmid" | "special";

export default function InterviewTermTabs() {
    const [selectedTerm, setSelectedTerm] = useState<number>(1);

    const initialSub: Record<number, TermVariant> = {
        1: "postmid",
        2: "beginning",
        3: "beginning",
        4: "beginning",
        5: "beginning",
        6: "beginning",
    };

    const [subTab, setSubTab] = useState<Record<number, TermVariant>>(initialSub);

    const form: UseFormReturn<Record<string, string>> = useForm<Record<string, string>>({
        defaultValues: {},
    });

    const { records, save, fetchAll, loading } = useInterviewForms([]);

    useEffect(() => {
        (async () => {
            await fetchAll();
        })();
    }, [fetchAll]);

    const currentVariant = subTab[selectedTerm];

    const fields =
        currentVariant === "postmid"
            ? postMidFields
            : currentVariant === "beginning"
                ? beginningFields
                : specialFields;

    async function onSubmit(values: Record<string, string>) {
        const prefix = `term${selectedTerm}_${currentVariant}_`;

        const payloadEntries = Object.entries(values).filter(([key]) =>
            key.startsWith(prefix)
        );

        const payload: Record<string, string> = Object.fromEntries(
            payloadEntries.map(([key, value]) => [key, value ?? ""])
        );

        const resp = await save({
            officer: "plcdr",
            ...payload,
            id: `${selectedTerm}_${currentVariant}_${Date.now()}`,
        });

        if (!resp) {
            console.error("failed to save");
            return;
        }

        form.reset({ ...form.getValues() });
    }

    const termTabs = [1, 2, 3, 4, 5, 6];

    const termLabels: Record<number, string> = {
        1: "I",
        2: "II",
        3: "III",
        4: "IV",
        5: "V",
        6: "VI",
    };

    return (
        <div className="max-w-6xl mx-auto p-6 bg-white rounded-xl shadow">
            {/* TERM TABS */}
            <div className="mb-4 flex gap-2 justify-center">
                {termTabs.map((term) => {
                    const label = termLabels[term];
                    const isActive = selectedTerm === term;

                    return (
                        <button
                            key={term}
                            type="button"
                            onClick={() => setSelectedTerm(term)}
                            className={`px-4 py-2 rounded-t-lg ${isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                                }`}
                        >
                            {`TERM ${label}`}
                        </button>
                    );
                })}
            </div>

            {/* SUB-TABS */}
            <div className="flex gap-2 justify-center mb-6">
                {selectedTerm === 1 ? (
                    <>
                        {/* POST MID TERM */}
                        {(() => {
                            const variant = "postmid" as TermVariant;
                            const isActive = subTab[selectedTerm] === variant;

                            return (
                                <button
                                    key="postmid"
                                    type="button"
                                    onClick={() =>
                                        setSubTab((prev) => ({ ...prev, [selectedTerm]: variant }))
                                    }
                                    className={`px-3 py-2 rounded ${isActive ? "bg-blue-600 text-white" : "bg-gray-100"
                                        }`}
                                >
                                    Post Mid Term
                                </button>
                            );
                        })()}

                        {/* SPECIAL */}
                        {(() => {
                            const variant = "special" as TermVariant;
                            const isActive = subTab[selectedTerm] === variant;

                            return (
                                <button
                                    key="special"
                                    type="button"
                                    onClick={() =>
                                        setSubTab((prev) => ({ ...prev, [selectedTerm]: variant }))
                                    }
                                    className={`px-3 py-2 rounded ${isActive ? "bg-blue-600 text-white" : "bg-gray-100"
                                        }`}
                                >
                                    Special
                                </button>
                            );
                        })()}
                    </>
                ) : (
                    <>
                        {/* BEGINNING */}
                        {(() => {
                            const variant = "beginning" as TermVariant;
                            const isActive = subTab[selectedTerm] === variant;

                            return (
                                <button
                                    key="beginning"
                                    type="button"
                                    onClick={() =>
                                        setSubTab((prev) => ({ ...prev, [selectedTerm]: variant }))
                                    }
                                    className={`px-3 py-2 rounded ${isActive ? "bg-blue-600 text-white" : "bg-gray-100"
                                        }`}
                                >
                                    Beginning of Term
                                </button>
                            );
                        })()}

                        {/* POST MID */}
                        {(() => {
                            const variant = "postmid" as TermVariant;
                            const isActive = subTab[selectedTerm] === variant;

                            return (
                                <button
                                    key="postmid"
                                    type="button"
                                    onClick={() =>
                                        setSubTab((prev) => ({ ...prev, [selectedTerm]: variant }))
                                    }
                                    className={`px-3 py-2 rounded ${isActive ? "bg-blue-600 text-white" : "bg-gray-100"
                                        }`}
                                >
                                    Post Mid Term
                                </button>
                            );
                        })()}

                        {/* SPECIAL */}
                        {(() => {
                            const variant = "special" as TermVariant;
                            const isActive = subTab[selectedTerm] === variant;

                            return (
                                <button
                                    key="special"
                                    type="button"
                                    onClick={() =>
                                        setSubTab((prev) => ({ ...prev, [selectedTerm]: variant }))
                                    }
                                    className={`px-3 py-2 rounded ${isActive ? "bg-blue-600 text-white" : "bg-gray-100"
                                        }`}
                                >
                                    Special
                                </button>
                            );
                        })()}
                    </>
                )}
            </div>

            {/* FORM AREA */}
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <TermSubForm
                    form={form}
                    termIndex={selectedTerm}
                    variant={currentVariant}
                    fields={fields}
                />

                <div className="flex justify-center gap-3 mt-6">
                    <button type="submit" className="px-6 py-2 rounded bg-blue-600 text-white">
                        Save
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            const prefix = `term${selectedTerm}_${currentVariant}_`;

                            const resetValues = Object.fromEntries(
                                Object.entries(form.getValues()).map(([key, val]) => [
                                    key,
                                    key.startsWith(prefix) ? "" : val ?? "",
                                ])
                            );

                            form.reset(resetValues);
                        }}
                        className="px-6 py-2 rounded bg-gray-200"
                    >
                        Reset
                    </button>
                </div>
            </form>

            <div className="mt-4 text-sm text-muted-foreground">
                {loading ? (
                    <p>Loading / Saving...</p>
                ) : (
                    <p>Saved records: {records.length}</p>
                )}
            </div>
        </div>
    );
}
