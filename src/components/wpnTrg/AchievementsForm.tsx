import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import React from "react";
import { useFieldArray, UseFormRegister, Control } from "react-hook-form";

interface AchievementsFormProps {
    control: Control<any>;
    register: UseFormRegister<any>;
    onSubmit: () => void;
    onReset: () => void;
    onLastItemDeleted: () => void;
    disabled?: boolean;
}

export default function AchievementsForm({
    control,
    register,
    onSubmit,
    onReset,
    onLastItemDeleted,
    disabled = false,
}: AchievementsFormProps) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: "achievements",
    });

    const handleRemove = (index: number) => {
        if (fields.length === 1) {
            onLastItemDeleted();
        } else {
            remove(index);
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="font-bold text-primary mb-2">Special Achievements in Firing</h2>

            <div className="space-y-2">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center">
                        <span className="text-sm w-6">{index + 1}.</span>
                        <Input
                            {...register(`achievements.${index}.value` as const)}
                            placeholder="Enter achievement"
                            disabled={disabled}
                        />
                        {!disabled && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-red-500"
                                onClick={() => handleRemove(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            {!disabled && (
                <div className="flex justify-between items-center mt-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ value: "" })}
                    >
                        <Plus className="h-4 w-4 mr-2" /> Add Achievement
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onReset}
                    >
                        Cancel
                    </Button>
                </div>
            )}

            {/* Info Section */}
            <div className="mt-6 border rounded-lg p-4 bg-gray-50 flex justify-center">
                <div>
                    <div className="flex justify-center">
                        <h2 className="font-semibold underline mb-2">Special Achievement Like</h2>
                    </div>
                    <p className="text-sm leading-relaxed">
                        Best in WT, Best Firer, Participation in National Games (if applicable)
                    </p>
                </div>
            </div>

            {!disabled && (
                <div className="flex justify-center gap-4 pt-4">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                        Save Achievements
                    </Button>
                </div>
            )}
        </form>
    );
}
