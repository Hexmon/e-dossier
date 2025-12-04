"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    UseFormRegister,
    FieldArrayWithId,
    UseFieldArrayAppend,
    UseFieldArrayRemove
} from "react-hook-form";
import { FormValues } from "@/types/club-detls";

interface Props {
    register: UseFormRegister<FormValues>;
    fields: FieldArrayWithId<FormValues, "achievements", "id">[];
    append: UseFieldArrayAppend<FormValues, "achievements">;
    remove: UseFieldArrayRemove;
    onDeleteRow?: (index: number) => void;
    onSubmit?: (e?: any) => void;
    onReset?: () => void;
    disabled?: boolean;
    onEdit?: () => void;
}

export default function AchievementsForm({
    register,
    fields,
    append,
    remove,
    onSubmit,
    onDeleteRow,
    onReset,
    disabled = false,
    onEdit,
}: Props) {
    return (
        <form onSubmit={onSubmit ?? ((e) => e.preventDefault())}>
            <p className="mt-4 font-bold text-gray-700">
                <u>Spl Achievement</u> (Cane Orderly, Samman Toli, Nishan Toli, Best in Drill)
            </p>

            <div className="mt-3 space-y-3">
                {fields.map((field, i) => {
                    const { id } = field;
                    return (
                        <div key={id ?? i} className="flex items-center space-x-3">
                            <div className="w-6 text-sm">{i + 1}.</div>

                            <input type="hidden" {...register(`achievements.${i}.id` as const)} />

                            <Input
                                {...register(`achievements.${i}.achievement` as const)}
                                disabled={disabled}
                            />

                            {!disabled && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() =>
                                        onDeleteRow ? onDeleteRow(i) : remove(i)
                                    }
                                    className="ml-2"
                                >
                                    X
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>

            {!disabled && (
                <div className="flex justify-center items-center">
                    <Button
                        type="button"
                        className="mt-3 bg-green-600 text-white text-[12px]"
                        onClick={() => append({ id: null, achievement: "" })}
                    >
                        + Add Achievement
                    </Button>
                </div>
            )}

            {/* CONTROL BUTTONS */}
            {disabled ? (
                <div className="flex justify-center items-center mt-4">
                    <Button
                        type="button"
                        className="bg-blue-600 text-white"
                        onClick={onEdit}
                    >
                        Edit Achievements
                    </Button>
                </div>
            ) : (
                <div className="flex justify-center gap-4 mt-6">
                    <Button type="submit" className="bg-blue-600 text-white">
                        Save Achievements
                    </Button>

                    <Button type="button" variant="outline" onClick={onReset}>
                        Reset Achievements
                    </Button>
                </div>
            )}
        </form>
    );
}
