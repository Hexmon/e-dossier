import React, { useEffect, useState } from "react";
import { UseFormReturn, FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { pageOne, pageTwo } from "@/constants/app.constants";
import { Edit, RotateCcw, Save } from "lucide-react";

interface Props {
    form: UseFormReturn<FieldValues>;
    tabName?: string;
}

export default function PLCdrCombinedForm({ form, tabName = "PL CDR" }: Props) {
    const { register, handleSubmit, reset, watch } = form;

    const formValues = watch();
    const hasSavedData = formValues && Object.keys(formValues).length > 0 &&
        Object.values(formValues).some(value => value !== "" && value !== null && value !== undefined);

    const [isEditing, setIsEditing] = useState(!hasSavedData);
    const [isSaved, setIsSaved] = useState(hasSavedData);

    useEffect(() => {
        if (hasSavedData && !isEditing) {
            setIsSaved(true);
        }
    }, [hasSavedData, isEditing]);

    const onSubmit = (data: FieldValues) => {
        console.log("Form data:", data);

        toast.success(`${tabName} Initial Interview saved successfully!`);

        setIsEditing(false);
        setIsSaved(true);
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        handleSubmit(onSubmit)();
    };

    const handleReset = () => {
        reset();
        toast.info("Form has been reset");
    };

    const handleCancel = () => {
        setIsEditing(false);
        toast.info("Changes cancelled");
    };

    const renderPageOneFields = () => {
        return pageOne.map(({ key, label }) => {
            return (
                <div key={key}>
                    <label className="block font-medium mb-2 text-sm">{label || "Field Label"}</label>
                    <Textarea
                        {...register(key)}
                        placeholder="Enter details..."
                        disabled={!isEditing}
                        className="w-full min-h-[100px] resize-y"
                    />
                </div>
            );
        });
    };

    const renderPageTwoFields = () => {
        return pageTwo.map(({ key, label }) => {
            return (
                <div key={key}>
                    <label className="block font-medium mb-2 text-sm">{label || "Field Label"}</label>
                    <Textarea
                        {...register(key)}
                        placeholder="Enter details..."
                        disabled={!isEditing}
                        className="w-full min-h-[100px] resize-y"
                    />
                </div>
            );
        });
    };

    return (
        <div className="border p-4 rounded-xl space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-xl">{tabName}</h3>
            </div>

            {/* Date Field at Top */}
            <div className="mb-4">
                <label className="block font-medium mb-2 text-sm">Date</label>
                <Input
                    type="date"
                    {...register("interviewDate")}
                    disabled={!isEditing}
                    className="w-full"
                />
            </div>
            {/* Term Field */}
            <div className="mb-4">
                <label className="block font-medium mb-2 text-sm">Term</label>
                <Input
                    type="text"
                    {...register("term")}
                    placeholder="Enter term..."
                    disabled={!isEditing}
                    className="w-full"
                />
            </div>

            {/* Page One Fields */}
            <div className="space-y-4">
                {renderPageOneFields()}
            </div>

            {/* Page Two Fields */}
            <div className="space-y-4">
                {renderPageTwoFields()}
            </div>

            {/* Initials Field at Bottom */}
            <div className="mt-6">
                <label className="block font-medium mb-2 text-sm">Initials</label>
                <Input
                    type="text"
                    {...register("initials")}
                    placeholder="Enter your initials..."
                    disabled={!isEditing}
                    className="w-full uppercase"
                    maxLength={10}
                />
            </div>
            <div className="flex justify-center items-center">
                {isSaved && !isEditing ? (
                    <>
                        <Button
                            type="button"
                            onClick={handleEdit}
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
                            onClick={handleSave}
                            className="flex items-center gap-2"
                        >
                            <Save className="h-4 w-4" />
                            Save
                        </Button>
                        <Button
                            type="button"
                            onClick={handleReset}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Reset
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}