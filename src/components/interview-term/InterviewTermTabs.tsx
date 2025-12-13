"use client";

import React, { useEffect, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import TermSubForm from "./TermSubForm";
import { useInterviewForms } from "@/hooks/useInterviewForms";
import { beginningFields, postMidFields, specialFields } from "@/types/interview-term";

type TermVariant = "beginning" | "postmid" | "special";

interface FormState {
    isEditing: boolean;
    isSaved: boolean;
}

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

    // Store form state for each term + variant combination
    const [formStates, setFormStates] = useState<Record<string, FormState>>({});

    const form: UseFormReturn<Record<string, string>> = useForm<Record<string, string>>({
        defaultValues: {},
    });

    const { records, save, fetchAll, loading } = useInterviewForms([]);

    useEffect(() => {
        (async () => {
            await fetchAll();
        })();
    }, [fetchAll]);

    const currentVariant = subTab[selectedTerm] ?? "beginning";
    const stateKey = `${selectedTerm}_${currentVariant}`;
    const currentFormState = formStates[stateKey] ?? { isEditing: true, isSaved: false };

    const fields =
        currentVariant === "postmid"
            ? postMidFields
            : currentVariant === "beginning"
                ? beginningFields
                : specialFields;

    const updateFormState = (updates: Partial<FormState>) => {
        setFormStates(prev => ({
            ...prev,
            [stateKey]: { ...currentFormState, ...updates }
        }));
    };

    const termTabs = [1, 2, 3, 4, 5, 6];

    const termLabels: Record<number, string> = {
        1: "I",
        2: "II",
        3: "III",
        4: "IV",
        5: "V",
        6: "VI",
    };

    const renderTermTabs = () => {
        return termTabs.map((term) => {
            const label = termLabels[term] ?? "";
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
        });
    };

    const renderSubTabs = () => {
        const variants: TermVariant[] = selectedTerm === 1
            ? ["postmid", "special"]
            : ["beginning", "postmid", "special"];

        const variantLabels: Record<TermVariant, string> = {
            beginning: "Beginning of Term",
            postmid: "Post Mid Term",
            special: "Special"
        };

        return variants.map((variant) => {
            const isActive = subTab[selectedTerm] === variant;
            const label = variantLabels[variant] ?? "";

            return (
                <button
                    key={variant}
                    type="button"
                    onClick={() => setSubTab((prev) => ({ ...prev, [selectedTerm]: variant }))}
                    className={`px-3 py-2 rounded ${isActive ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                >
                    {label}
                </button>
            );
        });
    };

    return (
        <div className="max-w-6xl mx-auto p-6 bg-white rounded-xl shadow">
            {/* TERM TABS */}
            <div className="mb-4 flex gap-2 justify-center">
                {renderTermTabs()}
            </div>

            {/* SUB-TABS */}
            <div className="flex gap-2 justify-center mb-6">
                {renderSubTabs()}
            </div>

            {/* FORM AREA */}
            <TermSubForm
                form={form}
                termIndex={selectedTerm}
                variant={currentVariant}
                fields={fields}
                isEditing={currentFormState.isEditing}
                isSaved={currentFormState.isSaved}
                onSave={save}
                updateFormState={updateFormState}
            />
        </div>
    );
}