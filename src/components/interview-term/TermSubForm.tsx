"use client";

import React, { useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FieldDef } from "@/types/interview-term";
import { InterviewFormRecord, InterviewOfficer } from "@/types/interview";
import { Edit, Save, RotateCcw, X } from "lucide-react";
import { saveTermInterviewForm, clearTermInterviewForm, SpecialInterviewRecord } from "@/store/slices/termInterviewSlice";

interface FormState {
    isEditing: boolean;
    isSaved: boolean;
}

interface Props {
    form: UseFormReturn<Record<string, string>>;
    termIndex: number;
    variant: "beginning" | "postmid" | "special";
    fields: FieldDef[];
    isEditing: boolean;
    isSaved: boolean;
    onSave: (payload: InterviewFormRecord) => Promise<InterviewFormRecord | null>;
    updateFormState: (updates: Partial<FormState>) => void;
    ocId: string;
    savedSpecialInterviews: SpecialInterviewRecord[];
    onClearForm: () => void;
}

export default function TermSubForm({
    form,
    termIndex,
    variant,
    fields,
    isEditing,
    isSaved,
    onSave,
    updateFormState,
    ocId,
    savedSpecialInterviews,
    onClearForm,
}: Props) {
    const dispatch = useDispatch();
    const { register, getValues, reset, handleSubmit } = form;

    const prefix = `term${termIndex}_${variant}_`;
    const dateKey = `${prefix}date`;
    const interviewedByKey = `${prefix}interviewedBy`;

    // Additional fields for beginning of term (3 sets)
    const remarks1Key = `${prefix}remarks1`;
    const remarksName1Key = `${prefix}remarksName1`;
    const remarks2Key = `${prefix}remarks2`;
    const remarksName2Key = `${prefix}remarksName2`;
    const remarks3Key = `${prefix}remarks3`;
    const remarksName3Key = `${prefix}remarksName3`;

    // Special tab - dynamic interview records (initialize from Redux)
    const [specialInterviews, setSpecialInterviews] = React.useState<SpecialInterviewRecord[]>(
        savedSpecialInterviews || []
    );

    // Sync special interviews with Redux
    useEffect(() => {
        setSpecialInterviews(savedSpecialInterviews || []);
    }, [savedSpecialInterviews]);

    // Auto-save special interviews to Redux
    useEffect(() => {
        if (variant === "special" && ocId) {
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
        }
    }, [specialInterviews, variant, ocId, termIndex, dispatch]);

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

        // Add special interviews to payload if variant is special
        if (variant === "special") {
            payload.specialInterviews = specialInterviews;
        }

        const resp = await onSave(payload);

        if (!resp) {
            toast.error("Failed to save");
            return;
        }

        toast.success(`Term ${termIndex} ${variantLabels[variant] ?? ""} saved successfully!`);

        // Clear Redux cache after successful save
        dispatch(clearTermInterviewForm({ ocId, termIndex, variant }));

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

    const handleCancelClick = () => {
        updateFormState({ isEditing: false });
        toast.info("Changes cancelled");
    };

    const addSpecialInterview = () => {
        setSpecialInterviews([...specialInterviews, { date: "", summary: "", interviewedBy: "" }]);
    };

    const removeSpecialInterview = (index: number) => {
        setSpecialInterviews(specialInterviews.filter((_, i) => i !== index));
    };

    const renderFields = () => {
        return fields.map(({ key, label }) => {
            const scopedKey = `${prefix}${key}`;
            const value = (getValues(scopedKey) as string) ?? "";

            const displayLabel = variant === "special" && key === "details"
                ? "Interview Summary"
                : label ?? "Field Label";

            return (
                <div key={scopedKey} className="mb-4">
                    <label className="block text-sm font-medium mb-1">{displayLabel}</label>
                    <Textarea
                        {...register(scopedKey)}
                        placeholder={displayLabel}
                        disabled={!isEditing}
                        className="w-full min-h-[100px] resize-y"
                        defaultValue={value}
                    />
                </div>
            );
        });
    };

    return (
        <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-xl">
                    {`Term ${termIndex} — ${variantLabels[variant] ?? ""}`}
                </h4>
            </div>

            {variant !== "special" && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <Input
                        type="date"
                        {...register(dateKey)}
                        disabled={!isEditing}
                        defaultValue={(getValues(dateKey) as string) ?? ""}
                    />
                </div>
            )}

            {variant !== "special" && (
                <div className="space-y-4">
                    {renderFields()}
                </div>
            )}

            {variant === "beginning" && (
                <div className="mt-6 pt-6 border-t space-y-4">
                    <h5 className="font-semibold text-lg mb-4">Additional Information</h5>

                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Remarks</label>
                                <Textarea
                                    {...register(remarks1Key)}
                                    placeholder="Enter remarks..."
                                    disabled={!isEditing}
                                    className="w-full min-h-[100px] resize-y"
                                    defaultValue={(getValues(remarks1Key) as string) ?? ""}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Interviewed by Pl Cdr</label>
                                <Input
                                    {...register(remarksName1Key)}
                                    placeholder="Name & Appointment"
                                    disabled={!isEditing}
                                    defaultValue={(getValues(remarksName1Key) as string) ?? ""}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Remarks</label>
                                <Textarea
                                    {...register(remarks2Key)}
                                    placeholder="Enter remarks..."
                                    disabled={!isEditing}
                                    className="w-full min-h-[100px] resize-y"
                                    defaultValue={(getValues(remarks2Key) as string) ?? ""}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Interviewed by Dy Cdr</label>
                                <Input
                                    {...register(remarksName2Key)}
                                    placeholder="Name & Appointment"
                                    disabled={!isEditing}
                                    defaultValue={(getValues(remarksName2Key) as string) ?? ""}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Remarks</label>
                                <Textarea
                                    {...register(remarks3Key)}
                                    placeholder="Enter remarks..."
                                    disabled={!isEditing}
                                    className="w-full min-h-[100px] resize-y"
                                    defaultValue={(getValues(remarks3Key) as string) ?? ""}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Interviewed by Cdr</label>
                                <Input
                                    {...register(remarksName3Key)}
                                    placeholder="Name & Appointment"
                                    disabled={!isEditing}
                                    defaultValue={(getValues(remarksName3Key) as string) ?? ""}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {variant === "postmid" && (
                <div className="mt-6">
                    <label className="block text-sm font-medium mb-1">Interviewed by (Name & Appt)</label>
                    <Input
                        {...register(interviewedByKey)}
                        placeholder="Name & Appointment"
                        disabled={!isEditing}
                        defaultValue={(getValues(interviewedByKey) as string) ?? ""}
                    />
                </div>
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
                            No interview records yet. Click "Add Record" to create one.
                        </div>
                    )}

                    {specialInterviews.map((interview, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-gray-50 space-y-4">
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
                                <label className="block text-sm font-medium mb-1">Date</label>
                                <Input
                                    type="date"
                                    value={interview.date}
                                    onChange={(e) => {
                                        const updated = [...specialInterviews];
                                        updated[index].date = e.target.value;
                                        setSpecialInterviews(updated);
                                    }}
                                    disabled={!isEditing}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Interview Summary</label>
                                <Textarea
                                    value={interview.summary}
                                    onChange={(e) => {
                                        const updated = [...specialInterviews];
                                        updated[index].summary = e.target.value;
                                        setSpecialInterviews(updated);
                                    }}
                                    placeholder="Enter interview summary..."
                                    disabled={!isEditing}
                                    className="w-full min-h-[100px] resize-y"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Interviewed by (Name & Appt)</label>
                                <Input
                                    value={interview.interviewedBy}
                                    onChange={(e) => {
                                        const updated = [...specialInterviews];
                                        updated[index].interviewedBy = e.target.value;
                                        setSpecialInterviews(updated);
                                    }}
                                    placeholder="Name & Appointment"
                                    disabled={!isEditing}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-center mt-6 gap-2">
                {isSaved && !isEditing ? (
                    <>
                        <Button
                            type="button"
                            onClick={handleEditClick}
                            variant="outline"
                            className="flex items-center gap-2 bg-blue-950 text-white"
                        >
                            <Edit className="h-4 w-4 text-white" />
                            Edit
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            type="button"
                            onClick={handleSaveClick}
                            className="flex items-center gap-2"
                        >
                            <Save className="h-4 w-4" />
                            Save
                        </Button>
                        <Button
                            type="button"
                            onClick={handleResetClick}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Clear Form
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}