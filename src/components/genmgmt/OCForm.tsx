"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OCRecord } from "@/app/lib/api/ocApi";

interface OCFormProps {
    onSubmit: (data: Partial<OCRecord>) => void;
    onCancel: () => void;
    defaultValues?: Partial<OCRecord>;
    courses: Array<{ id: string; code?: string; title?: string }>;
    platoons: Array<{ id: string; name?: string }>;
    isEditing: boolean;
}

export function OCForm({
    onSubmit,
    onCancel,
    defaultValues = {},
    courses,
    platoons,
    isEditing,
}: OCFormProps) {
    const { register, handleSubmit } = useForm<Partial<OCRecord>>({
        defaultValues,
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleFormSubmit = async (data: Partial<OCRecord>) => {
        if (selectedFile) {
            const submitData = { ...data, photo: selectedFile };
            onSubmit(submitData);
        } else {
            onSubmit(data);
        }
    };

    return (
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{isEditing ? "Update OC" : "Add New OC"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-2 gap-4 mb-6">

                <div>
                    <Label>Upload Photo</Label>
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    {selectedFile && (
                        <div className="mt-2">
                            <p className="text-sm text-gray-600">
                                Selected: {selectedFile.name}
                            </p>
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
                    <Label>Name</Label>
                    <Input {...register("name", { required: true })} />
                </div>

                <div>
                    <Label>TES No</Label>
                    <Input {...register("ocNo", { required: true })} />
                </div>

                <div>
                    <Label>Course</Label>
                    <select
                        {...register("course.id", { required: true })}
                        className="w-full border rounded-md p-2"
                    >
                        <option value="">Select Course</option>
                        {courses.map(({ id, code, title }) => (
                            <option key={id} value={id}>
                                {code ?? title ?? "Untitled Course"}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <Label>Branch</Label>
                    <Input {...register("branch")} placeholder="E / M / O" />
                </div>

                <div>
                    <Label>Platoon</Label>
                    <select
                        {...register("platoonId")}
                        className="w-full border rounded-md p-2"
                    >
                        <option value="">Select Platoon</option>
                        {platoons.map(({ id, name }) => (
                            <option key={id} value={id}>
                                {name ?? "Unnamed"}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <Label>Arrival Date</Label>
                    <Input type="date" {...register("arrivalAtUniversity")} />
                </div>

                <div className="col-span-2 flex justify-end gap-2 mt-4">
                    <Button variant="outline" type="button" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit">{isEditing ? "Update" : "Save"}</Button>
                </div>
            </form>
        </DialogContent>
    );
}