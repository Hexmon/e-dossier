import React, { useEffect, useMemo, useRef, useState } from "react";
import { UseFormReturn, FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Edit, RotateCcw, Save, X } from "lucide-react";
import type { TemplateField, TemplateInfo, TemplateSection } from "@/types/interview-templates";

interface Props {
    form: UseFormReturn<FieldValues>;
    tabName?: string;
    template?: TemplateInfo | null;
    onClearForm?: () => void;
    onSave?: (data: FieldValues) => Promise<any>;
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

export default function PLCdrCombinedForm({
    form,
    tabName = "PL CDR",
    template,
    onClearForm,
    onSave,
}: Props) {
    const { register, handleSubmit, reset, watch } = form;
    const editBaselineRef = useRef<Record<string, unknown> | null>(null);

    const formValues = watch();
    const hasSavedData =
        formValues &&
        Object.keys(formValues).length > 0 &&
        Object.values(formValues).some((value) => value !== "" && value !== null && value !== undefined);

    const [isEditing, setIsEditing] = useState(false);
    const [isSaved, setIsSaved] = useState(hasSavedData);

    const sections = useMemo(() => getTemplateSections(template), [template]);
    const hasTemplateContent = sections.length > 0;

    useEffect(() => {
        if (!isEditing) {
            setIsSaved(Boolean(hasSavedData));
        }
    }, [hasSavedData, isEditing]);

    const onSubmit = async (data: FieldValues) => {
        try {
            const resp = onSave ? await onSave(data) : true;
            if (onSave && !resp) {
                toast.error(`Failed to save ${tabName} Initial Interview`);
                return;
            }

            toast.success(`${tabName} Initial Interview saved successfully!`);

            setIsEditing(false);
            setIsSaved(true);
        } catch (err) {
            toast.error(`Failed to save ${tabName} Initial Interview`);
        }
    };

    const handleEdit = () => {
        editBaselineRef.current = { ...(watch() ?? {}) };
        setIsEditing(true);
    };

    const handleSave = () => {
        handleSubmit(onSubmit)();
    };

    const handleReset = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            reset();
            onClearForm?.();
            toast.info("Form has been reset");
        }
    };

    const handleCancel = () => {
        const baseline = editBaselineRef.current ?? {};
        reset(baseline);
        setIsEditing(false);
        const baselineHasData = Object.values(baseline).some(
            (value) => value !== "" && value !== null && value !== undefined
        );
        setIsSaved(baselineHasData);
    };

    const renderField = (field: TemplateField) => {
        const label = field.label || field.key;
        const type = field.fieldType?.toLowerCase?.() ?? "text";

        if (type === "textarea") {
            return (
                <div key={field.id}>
                    <label className="block font-medium mb-2 text-sm">
                        {label}
                        {field.required ? " *" : ""}
                    </label>
                    <Textarea
                        {...register(field.key)}
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
                <div key={field.id}>
                    <label className="block font-medium mb-2 text-sm">
                        {label}
                        {field.required ? " *" : ""}
                    </label>
                    <select {...register(field.key)} disabled={!isEditing} className="w-full border rounded px-3 py-2">
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
                <label key={field.id} className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" {...register(field.key)} disabled={!isEditing} className="h-4 w-4" />
                    {label}
                </label>
            );
        }

        const inputType = type === "date" ? "date" : type === "number" ? "number" : "text";
        return (
            <div key={field.id}>
                <label className="block font-medium mb-2 text-sm">
                    {label}
                    {field.required ? " *" : ""}
                </label>
                <Input
                    type={inputType}
                    {...register(field.key)}
                    placeholder={label}
                    disabled={!isEditing}
                    className="w-full"
                />
                {field.helpText ? <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p> : null}
            </div>
        );
    };

    return (
        <div className="border p-4 rounded-xl space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-xl">{template?.title || tabName}</h3>
            </div>

            {sections.length === 0 ? (
                <div className="text-sm text-muted-foreground">No interview template configured.</div>
            ) : (
                sections.map((section) => (
                    <div key={section.id} className="space-y-4">
                        <div className="space-y-4">{section.fields.map(renderField)}</div>
                    </div>
                ))
            )}

            {hasTemplateContent ? (
                <div className="flex justify-center items-center gap-2">
                    {!isEditing ? (
                        <Button
                            type="button"
                            onClick={handleEdit}
                            variant="outline"
                            className="flex items-center gap-2 bg-primary text-primary-foreground"
                        >
                            <Edit className="h-4 w-4 text-primary-foreground" />
                            Edit
                        </Button>
                    ) : (
                        <>
                            <Button type="button" onClick={handleSave} className="flex items-center gap-2">
                                <Save className="h-4 w-4" />
                                Save
                            </Button>
                            <Button type="button" onClick={handleReset} variant="outline" className="flex items-center gap-2">
                                <RotateCcw className="h-4 w-4" />
                                Clear Form
                            </Button>
                            <Button type="button" onClick={handleCancel} variant="outline" className="flex items-center gap-2">
                                <X className="h-4 w-4" />
                                Cancel
                            </Button>
                        </>
                    )}
                </div>
            ) : null}
        </div>
    );
}
