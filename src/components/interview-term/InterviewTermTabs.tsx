"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { useSelector, useDispatch } from "react-redux";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { RootState } from "@/store";
import TermSubForm from "./TermSubForm";
import { useInterviewForms } from "@/hooks/useInterviewForms";
import { useMe } from "@/hooks/useMe";
import { getTemplateMatchForSemester } from "@/lib/interviewTemplateMatching";
import { saveTermInterviewForm, clearTermInterviewForm } from "@/store/slices/termInterviewSlice";
import { applySignatureDefaults, getCurrentUserSignature, hasMeaningfulSignatureValue, isSignatureTemplateField } from "@/lib/currentUserSignature";

type TermVariant = "beginning" | "postmid" | "special";

interface FormState {
    isEditing: boolean;
    isSaved: boolean;
}

const postMidPlCdrAliases = [
    "pl cdr",
    "plcdr",
    "pl cdr remarks",
    "plcdr remarks",
    "platoon cdr",
    "platoon commander",
];

function hasPersistedData(entry: { formFields?: Record<string, string>; specialInterviews?: unknown[] } | undefined) {
    const hasFields = Boolean(
        entry?.formFields &&
        Object.values(entry.formFields).some((value) => value !== "" && value !== null && value !== undefined),
    );
    const hasSpecial = Boolean(entry?.specialInterviews && entry.specialInterviews.length > 0);
    return hasFields || hasSpecial;
}

function buildTermInterviewResetValues(params: {
    currentValues: Record<string, string>;
    savedValues: Record<string, string>;
    termIndex: number;
    variant: TermVariant;
    templateFields?: Array<{ key: string; label?: string; fieldType?: string | null; captureSignature?: boolean; groupId?: string | null }>;
    signatureValue?: string;
}) {
    const out: Record<string, string> = {};
    const prefix = `term${params.termIndex}_${params.variant}_`;

    for (const key of Object.keys(params.currentValues ?? {})) {
        out[key] = "";
    }

    for (const field of params.templateFields ?? []) {
        if (field.groupId) continue;
        const scopedKey = field.key.startsWith(prefix) ? field.key : `${prefix}${field.key}`;
        out[scopedKey] = "";
    }

    for (const [key, value] of Object.entries(params.savedValues ?? {})) {
        out[key] = value;
    }

    const signatureFields =
        params.variant === "postmid"
            ? (params.templateFields ?? []).filter((field) => {
                const hay = `${field.key ?? ""} ${field.label ?? ""}`.toLowerCase();
                return postMidPlCdrAliases.some((alias) => hay.includes(alias));
            })
            : params.templateFields;

    return applySignatureDefaults({
        values: out,
        fields: signatureFields,
        signatureValue: params.signatureValue,
        resolveKey: (field) => (field.key.startsWith(prefix) ? field.key : `${prefix}${field.key}`),
    });
}

export default function InterviewTermTabs() {
    const { id } = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";
    const dispatch = useDispatch();
    const { data: meData } = useMe();
    const hydratedRef = useRef(false);
    const isHydratingRef = useRef(false);

    const parseSemesterParam = (value: string | null) => {
        const n = Number(value);
        return Number.isInteger(n) && n >= 1 && n <= 6 ? n : 1;
    };

    const [selectedTerm, setSelectedTerm] = useState<number>(() => parseSemesterParam(searchParams.get("sem")));

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

    // Get saved form data from Redux
    const savedFormData = useSelector((state: RootState) =>
        state.termInterview.forms[ocId]?.[selectedTerm]?.[subTab[selectedTerm]]
    );
    const savedSpecialInterviews = React.useMemo(
        () => savedFormData?.specialInterviews ?? [],
        [savedFormData?.specialInterviews],
    );

    const form: UseFormReturn<Record<string, string>> = useForm<Record<string, string>>({
        defaultValues: savedFormData?.formFields || {},
    });

    const { fetchTerm, saveTerm, templateMappings } = useInterviewForms(ocId);
    const allSavedForms = useSelector((state: RootState) => state.termInterview.forms[ocId] || {});
    const savedFormsRef = useRef(allSavedForms);

    useEffect(() => {
        const semFromUrl = parseSemesterParam(searchParams.get("sem"));
        setSelectedTerm((current) => (current === semFromUrl ? current : semFromUrl));
    }, [searchParams]);

    useEffect(() => {
        const currentUrlSem = parseSemesterParam(searchParams.get("sem"));
        if (currentUrlSem === selectedTerm) return;

        const next = new URLSearchParams(searchParams.toString());
        next.set("sem", String(selectedTerm));
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    }, [selectedTerm, pathname, router, searchParams]);

    useEffect(() => {
        hydratedRef.current = false;
    }, [ocId]);

    useEffect(() => {
        savedFormsRef.current = allSavedForms;
    }, [allSavedForms]);

    useEffect(() => {
        if (!ocId || hydratedRef.current) return;
        hydratedRef.current = true;

        (async () => {
            const data = await fetchTerm();
            if (!data) return;

            Object.entries(data).forEach(([termKey, variants]) => {
                const termIndex = Number(termKey);
                (Object.keys(variants) as TermVariant[]).forEach((variant) => {
                    const incoming = variants[variant];
                    if (!incoming) return;

                    const existing = savedFormsRef.current?.[termIndex]?.[variant];
                    const isEmptyFields =
                        !existing?.formFields ||
                        Object.values(existing.formFields).every(
                            (value) => value === "" || value === null || value === undefined
                        );
                    const hasSpecial = (existing?.specialInterviews ?? []).length > 0;

                    if (!isEmptyFields || hasSpecial) return;

                    dispatch(
                        saveTermInterviewForm({
                            ocId,
                            termIndex,
                            variant,
                            data: incoming,
                        })
                    );

                    const key = `${termIndex}_${variant}`;
                    if (hasPersistedData(incoming)) {
                        setFormStates((prev) => ({
                            ...prev,
                            [key]: { isEditing: false, isSaved: true },
                        }));
                    }
                });
            });
        })();
    }, [ocId, fetchTerm, dispatch]);

    const currentVariant = subTab[selectedTerm] ?? "beginning";
    const currentUserSignature = getCurrentUserSignature(meData);
    const termMatch = getTemplateMatchForSemester(templateMappings, currentVariant, selectedTerm);
    const termTemplate = termMatch?.template ?? null;
    const specialGroup = currentVariant === "special" && termMatch?.groupId
        ? termTemplate?.groups.find((group) => group.id === termMatch.groupId) ?? null
        : null;

    // Load saved data when switching terms or variants
    useEffect(() => {
        isHydratingRef.current = true;
        const savedData = savedFormData?.formFields || {};
        form.reset(
            buildTermInterviewResetValues({
                currentValues: form.getValues(),
                savedValues: savedData,
                termIndex: selectedTerm,
                variant: currentVariant,
                templateFields: Array.from(termTemplate?.fieldsByKey?.values?.() ?? []),
            }),
        );
        queueMicrotask(() => {
            isHydratingRef.current = false;
        });
    }, [selectedTerm, currentVariant, ocId, form, savedFormData?.formFields, termTemplate]);

    useEffect(() => {
        if (!currentUserSignature) return;

        const prefix = `term${selectedTerm}_${currentVariant}_`;
        const signatureFields = Array.from(termTemplate?.fieldsByKey?.values?.() ?? [])
            .filter((field) => !field.groupId && isSignatureTemplateField(field))
            .filter((field) => {
                if (currentVariant !== "postmid") return true;
                const hay = `${field.key ?? ""} ${field.label ?? ""}`.toLowerCase();
                return postMidPlCdrAliases.some((alias) => hay.includes(alias));
            });
        if (!signatureFields.length) return;

        for (const field of signatureFields) {
            const scopedKey = field.key.startsWith(prefix) ? field.key : `${prefix}${field.key}`;
            const savedValue = savedFormData?.formFields?.[scopedKey];
            const currentValue = form.getValues(scopedKey);
            if (hasMeaningfulSignatureValue(savedValue) || hasMeaningfulSignatureValue(currentValue)) continue;

            form.setValue(scopedKey, currentUserSignature, {
                shouldDirty: false,
                shouldTouch: false,
            });
        }
    }, [currentUserSignature, currentVariant, form, savedFormData?.formFields, selectedTerm, termTemplate]);

    // Auto-save to Redux on form changes
    useEffect(() => {
        const subscription = form.watch((value) => {
            if (isHydratingRef.current) return;
            if (!ocId || !value) return;

            const formFields = Object.entries(value).reduce<Record<string, string>>(
                (acc, [key, val]) => {
                    acc[key] = (val as string) ?? "";
                    return acc;
                },
                {}
            );

            dispatch(saveTermInterviewForm({
                ocId,
                termIndex: selectedTerm,
                variant: currentVariant,
                data: { formFields },
            }));
        });

        return () => subscription.unsubscribe();
    }, [form, dispatch, ocId, selectedTerm, currentVariant]);

    const stateKey = `${selectedTerm}_${currentVariant}`;
    const defaultStateFromData = hasPersistedData(savedFormData)
        ? { isEditing: false, isSaved: true }
        : { isEditing: false, isSaved: false };
    const currentFormState = formStates[stateKey] ?? defaultStateFromData;

    const templatesLoaded = Boolean(templateMappings);
    const missingTemplate = templatesLoaded && !termTemplate;
    const specialGroupMissing = templatesLoaded && currentVariant === "special" && termTemplate && !specialGroup;
    const formAvailable = Boolean(termTemplate) && (currentVariant !== "special" || Boolean(specialGroup));

    const updateFormState = (updates: Partial<FormState>) => {
        setFormStates(prev => ({
            ...prev,
            [stateKey]: { ...currentFormState, ...updates },
        }));
    };

    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearTermInterviewForm({
                ocId,
                termIndex: selectedTerm,
                variant: currentVariant,
            }));
            form.reset(
                buildTermInterviewResetValues({
                    currentValues: form.getValues(),
                    savedValues: {},
                    termIndex: selectedTerm,
                    variant: currentVariant,
                    templateFields: Array.from(termTemplate?.fieldsByKey?.values?.() ?? []),
                    signatureValue: currentUserSignature,
                }),
            );
        }
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
                    className={`px-4 py-2 rounded-t-lg ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
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
            special: "Special",
        };

        return variants.map((variant) => {
            const isActive = subTab[selectedTerm] === variant;
            const label = variantLabels[variant] ?? "";

            return (
                <button
                    key={variant}
                    type="button"
                    onClick={() => setSubTab((prev) => ({ ...prev, [selectedTerm]: variant }))}
                    className={`px-3 py-2 rounded ${isActive ? "bg-primary text-primary-foreground" : "bg-muted/70"}`}
                >
                    {label}
                </button>
            );
        });
    };

    return (
        <div className="max-w-6xl mx-auto p-6 bg-card rounded-xl shadow">
            {/* TERM TABS */}
            <div className="mb-4 flex gap-2 justify-center">
                {renderTermTabs()}
            </div>

            {/* SUB-TABS */}
            <div className="flex gap-2 justify-center mb-6">
                {renderSubTabs()}
            </div>

            {/* FORM AREA */}
            {formAvailable ? (
                <TermSubForm
                    form={form}
                    termIndex={selectedTerm}
                    variant={currentVariant}
                    template={termTemplate}
                    specialGroup={specialGroup}
                    isEditing={currentFormState.isEditing}
                    isSaved={currentFormState.isSaved}
                    onSave={async (payload) => {
                        const prefix = `term${selectedTerm}_${currentVariant}_`;
                        const formFields = Object.entries(payload).reduce<Record<string, string>>((acc, [key, value]) => {
                            if (key.startsWith(prefix)) {
                                acc[key] = String(value ?? "");
                            }
                            return acc;
                        }, {});

                        return saveTerm(selectedTerm, currentVariant, formFields, payload.specialInterviews);
                    }}
                    updateFormState={updateFormState}
                    ocId={ocId}
                    savedSpecialInterviews={savedSpecialInterviews}
                    onClearForm={handleClearForm}
                    currentUserSignature={currentUserSignature}
                />
            ) : (
                <div className="border rounded-lg p-6 bg-muted/40 text-center text-sm text-muted-foreground">
                    {!templatesLoaded ? (
                        <p>Loading templates... please wait a moment.</p>
                    ) : specialGroupMissing ? (
                        <p>The special interview group is not configured for the selected template.</p>
                    ) : missingTemplate ? (
                        <p>The selected interview template is not configured for this tab.</p>
                    ) : (
                        <p>The interview template does not support this variant.</p>
                    )}
                </div>
            )}

            {/* Auto-save indicator */}
            <p className="text-sm text-muted-foreground text-center mt-4">
                * Changes are automatically saved
            </p>
        </div>
    );
}
