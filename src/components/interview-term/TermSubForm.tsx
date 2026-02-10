"use client";

import React, { useEffect, useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { InterviewFormRecord, InterviewOfficer } from "@/types/interview";
import { Edit, Save, RotateCcw, X } from "lucide-react";
import { saveTermInterviewForm, SpecialInterviewRecord } from "@/store/slices/termInterviewSlice";
import type { TemplateField, TemplateGroup, TemplateInfo, TemplateSection } from "@/types/interview-templates";

interface FormState {
    isEditing: boolean;
    isSaved: boolean;
}

interface Props {
    form: UseFormReturn<Record<string, string>>;
    termIndex: number;
    variant: "beginning" | "postmid" | "special";
    template?: TemplateInfo | null;
    specialGroup?: TemplateGroup | null;
    isEditing: boolean;
    isSaved: boolean;
    onSave: (payload: InterviewFormRecord) => Promise<InterviewFormRecord | null>;
    updateFormState: (updates: Partial<FormState>) => void;
    ocId: string;
    savedSpecialInterviews: SpecialInterviewRecord[];
    onClearForm: () => void;
}

const specialFieldAliases: Record<string, string[]> = {
    date: ["date", "interviewdate", "interview_date"],
    summary: ["summary", "details", "remarks", "interviewsummary", "interview_summary"],
    interviewedby: ["interviewedby", "interviewer", "interviewed_by", "interviewedbyname"],
};

function normalizeKey(value: string) {
    return value.trim().toLowerCase();
}

function normalizeSpecialInterviews(records?: SpecialInterviewRecord[]) {
    return (records ?? []).map((record, index) => ({
        date: record.date ?? "",
        summary: record.summary ?? "",
        interviewedBy: record.interviewedBy ?? "",
        rowIndex: record.rowIndex ?? index,
        rowId: record.rowId,
    }));
}

function areSpecialInterviewsEqual(a: SpecialInterviewRecord[], b: SpecialInterviewRecord[]) {
    if (a.length !== b.length) return false;
    return a.every((record, index) => {
        const other = b[index];
        if (!other) return false;
        return (
            record.date === other.date &&
            record.summary === other.summary &&
            record.interviewedBy === other.interviewedBy &&
            (record.rowIndex ?? -1) === (other.rowIndex ?? -1) &&
            (record.rowId ?? null) === (other.rowId ?? null)
        );
    });
}

function getTemplateSections(template?: TemplateInfo | null): TemplateSection[] {
    if (!template) return [];
    if (template.sections?.length) return template.sections;

    const fields = Array.from(template.fieldsByKey.values())
        .filter((field) => !field.groupId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    if (!fields.length) return [];
    return [
        {
            id: `${template.id}-fields`,
            title: template.title,
            description: null,
            sortOrder: 0,
            fields,
        },
    ];
}

function getSpecialLabel(group: TemplateGroup | null | undefined, key: "date" | "summary" | "interviewedBy") {
    if (!group) return undefined;
    const target = normalizeKey(key);
    const aliases = specialFieldAliases[target] ?? [target];
    const normalizedAliases = new Set(aliases.map(normalizeKey));

    for (const field of group.fields) {
        if (normalizedAliases.has(normalizeKey(field.key))) {
            return field.label || field.key;
        }
    }
    return undefined;
}

export default function TermSubForm({
    form,
    termIndex,
    variant,
    template,
    specialGroup,
    isEditing,
    isSaved,
    onSave,
    updateFormState,
    ocId,
    savedSpecialInterviews,
    onClearForm,
}: Props) {
    const dispatch = useDispatch();
    const { register, getValues, reset } = form;

    const prefix = `term${termIndex}_${variant}_`;

    const sections = useMemo(() => getTemplateSections(template), [template]);
    const dateLabel = getSpecialLabel(specialGroup, "date") ?? "Date";
    const summaryLabel = getSpecialLabel(specialGroup, "summary") ?? "Interview Summary";
    const interviewedByLabel = getSpecialLabel(specialGroup, "interviewedBy") ?? "Interviewed by (Name & Appt)";

    const normalizedSavedSpecialInterviews = useMemo(
        () => normalizeSpecialInterviews(savedSpecialInterviews),
        [savedSpecialInterviews],
    );
    const [specialInterviews, setSpecialInterviews] = React.useState<SpecialInterviewRecord[]>(() =>
        normalizedSavedSpecialInterviews.map((record) => ({ ...record })),
    );

    // Special tab - dynamic interview records (initialize from Redux)
    // NOTE: state is initialized using the memoized normalized array to keep clones separate.

    // Sync special interviews with Redux
    useEffect(() => {
        if (variant !== "special") return;
        setSpecialInterviews((prev) => {
            if (areSpecialInterviewsEqual(prev, normalizedSavedSpecialInterviews)) {
                return prev;
            }
            return normalizedSavedSpecialInterviews.map((record) => ({ ...record }));
        });
    }, [variant, normalizedSavedSpecialInterviews]);

    // Auto-save special interviews to Redux
    useEffect(() => {
        if (variant !== "special" || !ocId || !isEditing) return;
        if (areSpecialInterviewsEqual(specialInterviews, normalizedSavedSpecialInterviews)) return;

        const formFields = getValues();
        dispatch(saveTermInterviewForm({
            ocId,
            termIndex,
            variant,
            data: {
                formFields,
                specialInterviews,
            },
        }));
    }, [
        specialInterviews,
        variant,
        ocId,
        termIndex,
        dispatch,
        getValues,
        normalizedSavedSpecialInterviews,
        isEditing,
    ]);

    const variantLabels: Record<string, string> = {
        beginning: "Beginning of Term",
        postmid: "Post Mid Term",
        special: "Special"
    };

    const handleSaveClick = async () => {
        const values = getValues();
        const payloadEntries = Object.entries(values).filter(([key]) => key.startsWith(prefix));
        const payload: InterviewFormRecord = {
            officer: "plcdr" as InterviewOfficer,
            id: `${termIndex}_${variant}_${Date.now()}`,
            ...Object.fromEntries(
                payloadEntries.map(([key, value]) => [key, value ?? ""])
            )
        };

        if (variant === "special") {
            payload.specialInterviews = specialInterviews;
        }

        const resp = await onSave(payload);

        if (!resp) {
            toast.error("Failed to save");
            return;
        }

        toast.success(`Term ${termIndex} ${variantLabels[variant] ?? ""} saved successfully!`);

        updateFormState({ isEditing: false, isSaved: true });
    };

    const handleEditClick = () => {
        updateFormState({ isEditing: true });
    };

    const handleResetClick = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            const resetValues = Object.fromEntries(
                Object.entries(getValues()).map(([key, val]) => [
                    key,
                    key.startsWith(prefix) ? "" : val ?? "",
                ])
            );
            reset(resetValues);

            if (variant === "special") {
                setSpecialInterviews([]);
            }

            onClearForm();
            toast.info("Form has been reset");
        }
    };

    const addSpecialInterview = () => {
        const nextIndex =
            specialInterviews.reduce((max, record) => Math.max(max, record.rowIndex ?? -1), -1) + 1;
        setSpecialInterviews([
            ...specialInterviews,
            { date: "", summary: "", interviewedBy: "", rowIndex: nextIndex },
        ]);
    };

    const removeSpecialInterview = (index: number) => {
        setSpecialInterviews(specialInterviews.filter((_, i) => i !== index));
    };

    const renderField = (field: TemplateField) => {
        const label = field.label || field.key;
        const type = field.fieldType?.toLowerCase?.() ?? "text";
        const scopedKey = field.key.startsWith(prefix) ? field.key : `${prefix}${field.key}`;

        if (type === "textarea") {
            return (
                <div key={scopedKey} className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                        {label}
                        {field.required ? " *" : ""}
                    </label>
                    <Textarea
                        {...register(scopedKey)}
                        placeholder={label}
                        disabled={!isEditing}
                        className="w-full min-h-[100px] resize-y"
                    />
                    {field.helpText ? <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p> : null}
                </div>
            );
        }

        if (type === "select") {
            const options = [...(field.options ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
            return (
                <div key={scopedKey} className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                        {label}
                        {field.required ? " *" : ""}
                    </label>
                    <select {...register(scopedKey)} disabled={!isEditing} className="w-full border rounded px-3 py-2">
                        <option value="">Select...</option>
                        {options.map((option) => (
                            <option key={option.id} value={option.code}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {field.helpText ? <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p> : null}
                </div>
            );
        }

        if (type === "checkbox") {
            return (
                <label key={scopedKey} className="flex items-center gap-2 text-sm font-medium mb-2">
                    <input type="checkbox" {...register(scopedKey)} disabled={!isEditing} className="h-4 w-4" />
                    {label}
                </label>
            );
        }

        const inputType = type === "date" ? "date" : type === "number" ? "number" : "text";
        return (
            <div key={scopedKey} className="mb-4">
                <label className="block text-sm font-medium mb-1">
                    {label}
                    {field.required ? " *" : ""}
                </label>
                <Input
                    type={inputType}
                    {...register(scopedKey)}
                    placeholder={label}
                    disabled={!isEditing}
                />
                {field.helpText ? <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p> : null}
            </div>
        );
    };

    return (
        <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-xl">
                    {`Term ${termIndex} - ${variantLabels[variant] ?? ""}`}
                </h4>
            </div>

            {variant !== "special" && (
                sections.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No interview template configured.</div>
                ) : (
                    sections.map((section) => (
                        <div key={section.id} className="space-y-3 mb-4">
                            {section.title ? <h5 className="font-semibold text-lg">{section.title}</h5> : null}
                            {section.description ? (
                                <p className="text-sm text-muted-foreground">{section.description}</p>
                            ) : null}
                            <div className="space-y-4">{section.fields.map(renderField)}</div>
                        </div>
                    ))
                )
            )}

            {variant === "special" && (
                <div className="mt-6 pt-6 border-t space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h5 className="font-semibold text-lg">Interview Records</h5>
                        {isEditing && (
                            <Button
                                type="button"
                                onClick={addSpecialInterview}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <span>+</span> Add Record
                            </Button>
                        )}
                    </div>

                    {specialInterviews.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No interview records yet. Click \"Add Record\" to create one.
                        </div>
                    )}

                    {specialInterviews.map((interview, index) => (
                        <div
                            key={interview.rowId ?? interview.rowIndex ?? index}
                            className="border rounded-lg p-4 bg-gray-50 space-y-4"
                        >
                            <div className="flex justify-between items-start">
                                <h6 className="font-medium text-md">Record {index + 1}</h6>
                                {isEditing && (
                                    <Button
                                        type="button"
                                        onClick={() => removeSpecialInterview(index)}
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{dateLabel}</label>
                        <Input
                            type="date"
                            value={interview.date}
                            onChange={(e) => {
                                setSpecialInterviews((current) =>
                                    current.map((record, idx) =>
                                        idx === index ? { ...record, date: e.target.value } : record
                                    )
                                );
                            }}
                            disabled={!isEditing}
                        />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{summaryLabel}</label>
                                <Textarea
                                    value={interview.summary}
                                    onChange={(e) => {
                                        setSpecialInterviews((current) =>
                                            current.map((record, idx) =>
                                                idx === index ? { ...record, summary: e.target.value } : record
                                            )
                                        );
                                    }}
                                    placeholder={summaryLabel}
                                    disabled={!isEditing}
                                    className="w-full min-h-[100px] resize-y"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{interviewedByLabel}</label>
                                <Input
                                    value={interview.interviewedBy}
                                    onChange={(e) => {
                                        setSpecialInterviews((current) =>
                                            current.map((record, idx) =>
                                                idx === index ? { ...record, interviewedBy: e.target.value } : record
                                            )
                                        );
                                    }}
                                    placeholder={interviewedByLabel}
                                    disabled={!isEditing}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-center mt-6 gap-2">
                {isSaved && !isEditing ? (
                    <Button
                        type="button"
                        onClick={handleEditClick}
                        variant="outline"
                        className="flex items-center gap-2 bg-blue-950 text-white"
                    >
                        <Edit className="h-4 w-4 text-white" />
                        Edit
                    </Button>
                ) : (
                    <>
                        <Button type="button" onClick={handleSaveClick} className="flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            Save
                        </Button>
                        <Button type="button" onClick={handleResetClick} variant="outline" className="flex items-center gap-2">
                            <RotateCcw className="h-4 w-4" />
                            Clear Form
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
