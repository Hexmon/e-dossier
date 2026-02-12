"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OCRecord } from "@/app/lib/api/ocApi";
import { Alert, AlertDescription } from "../ui/alert";

interface OCFormProps {
    onSubmit: (data: Partial<OCRecord>) => Promise<void>;
    onCancel: () => void;
    defaultValues?: Partial<OCRecord>;
    courses: Array<{ id: string; code?: string; title?: string }>;
    platoons: Array<{ id: string; name?: string }>;
    isEditing: boolean;
}

interface OCFormData {
    name: string;
    ocNo: string;
    courseId: string;
    branch?: string;
    platoonId?: string;
    arrivalAtUniversity?: string;
}

export function OCForm({
    onSubmit,
    onCancel,
    defaultValues = {},
    courses,
    platoons,
    isEditing,
}: OCFormProps) {
    const formDefaults: Partial<OCFormData> = {
        name: defaultValues.name || "",
        ocNo: defaultValues.ocNo || "",
        courseId: defaultValues.courseId ?? defaultValues.course?.id ?? "",
        branch: defaultValues.branch || "",
        platoonId: defaultValues.platoonId || "",
        arrivalAtUniversity: defaultValues.arrivalAtUniversity?.slice(0, 10) || "",
    };

    const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<OCFormData>({
        defaultValues: formDefaults,
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        defaultValues.photo ? String(defaultValues.photo) : null
    );
    const [apiErrors, setApiErrors] = useState<Record<string, string[]> | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleFormSubmit = async (data: OCFormData) => {
        // Clear previous API errors
        setApiErrors(null);

        // Validate required fields on frontend
        if (!data.courseId) {
            setApiErrors({ courseId: ["Please select a course"] });
            return;
        }

        if (!data.name?.trim()) {
            setApiErrors({ name: ["Name is required"] });
            return;
        }

        if (!data.ocNo?.trim()) {
            setApiErrors({ ocNo: ["TES No is required"] });
            return;
        }

        // Transform the form data to match API expectations
        const submitData: any = {
            name: data.name.trim(),
            ocNo: data.ocNo.trim(),
            courseId: data.courseId,
            branch: data.branch || undefined,
            platoonId: data.platoonId || undefined,
            arrivalAtUniversity: data.arrivalAtUniversity || undefined,
        };

        // Only include photo if a file was selected
        if (selectedFile) {
            submitData.photo = selectedFile;
        }

        try {
            await onSubmit(submitData);
            // Success is handled in parent component (shows toast, closes modal, etc.)
        } catch (error: any) {
            // Handle validation errors from API
            if (error.issues && error.issues.fieldErrors) {
                setApiErrors(error.issues.fieldErrors);
            }
            // Error toast is handled in parent component
        }
    };

    // Helper to get field error message
    const getFieldError = (fieldName: keyof OCFormData): string | null => {
        if (errors[fieldName]?.message) {
            return errors[fieldName]?.message as string;
        }
        if (apiErrors && apiErrors[fieldName]) {
            return apiErrors[fieldName][0];
        }
        return null;
    };

    return (
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{isEditing ? "Update OC" : "Add New OC"}</DialogTitle>
            </DialogHeader>

            {/* Show general validation errors */}
            {apiErrors && Object.keys(apiErrors).length > 0 && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                        <div className="font-semibold mb-2">Validation failed. Please fix the following errors:</div>
                        <ul className="list-disc list-inside space-y-1">
                            {Object.entries(apiErrors).map(([field, messages]) => (
                                <li key={field} className="text-sm">
                                    <strong>{field}:</strong> {messages[0]}
                                </li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-2 gap-4 mb-6">
                <div className="col-span-2">
                    <Label>Upload Photo</Label>
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    {(selectedFile || previewUrl) && (
                        <div className="mt-2">
                            {selectedFile && (
                                <p className="text-sm text-muted-foreground">
                                    Selected: {selectedFile.name}
                                </p>
                            )}
                            {previewUrl && (
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="mt-2 w-32 h-32 object-cover rounded border"
                                />
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <Label>Name *</Label>
                    <Input
                        {...register("name", {
                            required: "Name is required",
                            minLength: { value: 2, message: "Name must be at least 2 characters" }
                        })}
                        placeholder="Enter full name"
                    />
                    {getFieldError("name") && (
                        <p className="text-sm text-destructive mt-1">{getFieldError("name")}</p>
                    )}
                </div>

                <div>
                    <Label>TES No *</Label>
                    <Input
                        {...register("ocNo", {
                            required: "TES No is required",
                            pattern: {
                                value: /^[A-Z0-9-]+$/i,
                                message: "TES No should contain only letters, numbers and hyphens"
                            }
                        })}
                        placeholder="Enter TES number"
                    />
                    {getFieldError("ocNo") && (
                        <p className="text-sm text-destructive mt-1">{getFieldError("ocNo")}</p>
                    )}
                </div>

                <div>
                    <Label>Course *</Label>
                    <select
                        {...register("courseId", { required: "Course is required" })}
                        className="w-full border rounded-md p-2 bg-white"
                    >
                        <option value="">Select Course</option>
                        {courses.map(({ id, code, title }) => (
                            <option key={id} value={id}>
                                {code ?? title ?? "Untitled Course"}
                            </option>
                        ))}
                    </select>
                    {getFieldError("courseId") && (
                        <p className="text-sm text-destructive mt-1">{getFieldError("courseId")}</p>
                    )}
                </div>

                <div>
                    <Label>Branch</Label>
                    <select
                        {...register("branch")}
                        className="w-full border rounded-md p-2 bg-white"
                    >
                        <option value="">Select Branch</option>
                        <option value="O">O (Others)</option>
                        <option value="E">E (Electronics)</option>
                        <option value="M">M (Mechanical)</option>
                    </select>
                    {getFieldError("branch") && (
                        <p className="text-sm text-destructive mt-1">{getFieldError("branch")}</p>
                    )}
                </div>

                <div>
                    <Label>Platoon</Label>
                    <select
                        {...register("platoonId")}
                        className="w-full border rounded-md p-2 bg-white"
                    >
                        <option value="">Select Platoon</option>
                        {platoons.map(({ id, name }) => (
                            <option key={id} value={id}>
                                {name ?? "Unnamed"}
                            </option>
                        ))}
                    </select>
                    {getFieldError("platoonId") && (
                        <p className="text-sm text-destructive mt-1">{getFieldError("platoonId")}</p>
                    )}
                </div>

                <div>
                    <Label>Arrival Date</Label>
                    <Input
                        type="date"
                        {...register("arrivalAtUniversity", { required: "Course is required" })}
                    />
                    {getFieldError("arrivalAtUniversity") && (
                        <p className="text-sm text-destructive mt-1">{getFieldError("arrivalAtUniversity")}</p>
                    )}
                </div>

                <div className="col-span-2 flex justify-end gap-2 mt-4">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update" : "Save")}
                    </Button>
                </div>
            </form>
        </DialogContent>
    );
}