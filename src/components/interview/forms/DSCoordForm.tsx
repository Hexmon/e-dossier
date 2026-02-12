import React, { useEffect, useMemo, useState } from "react";
import { UseFormReturn, FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Edit, Save, RotateCcw } from "lucide-react";
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

export default function DSCoordForm({ form, tabName = "DS COORD", template, onClearForm, onSave }: Props) {
    const { register, handleSubmit, reset, watch } = form;

    const formValues = watch();
    const hasSavedData =
        formValues &&
        Object.keys(formValues).length > 0 &&
        Object.values(formValues).some((value) => value !== "" && value !== null && value !== undefined);

    const [isEditing, setIsEditing] = useState(!hasSavedData);
    const [isSaved, setIsSaved] = useState(hasSavedData);

    const sections = useMemo(() => getTemplateSections(template), [template]);

    useEffect(() => {
        if (hasSavedData && !isEditing) {
            setIsSaved(true);
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
                <h3 className="font-semibold text-xl">{tabName}</h3>
            </div>

            {sections.length === 0 ? (
                <div className="text-sm text-muted-foreground">No interview template configured.</div>
            ) : (
                sections.map((section) => (
                    <div key={section.id} className="space-y-4">
                        {section.title ? <h4 className="font-semibold text-lg">{section.title}</h4> : null}
                        {section.description ? (
                            <p className="text-sm text-muted-foreground">{section.description}</p>
                        ) : null}
                        <div className="space-y-4">{section.fields.map(renderField)}</div>
                    </div>
                ))
            )}

            <div className="flex items-center justify-center gap-2">
                {isSaved && !isEditing ? (
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
                    </>
                )}
            </div>
        </div>
    );
}
