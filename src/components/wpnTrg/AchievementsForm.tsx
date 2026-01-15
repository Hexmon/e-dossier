"use client";

import React, { useEffect } from "react";
import { useFieldArray, Control, UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SpecialAchievementInFiringRecord } from "@/app/lib/api/specialAchievementInFiringApi";

type AchievementRow = { achievement: string };

interface Props {
    savedAchievements: SpecialAchievementInFiringRecord[];
    onSave: (list: AchievementRow[]) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    disabled?: boolean;
    control?: Control<any>;
    register?: UseFormRegister<any>;
}

export default function AchievementsForm({
    savedAchievements,
    onSave,
    onDelete,
    disabled = false,
    control,
    register,
}: Props) {
    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "achievements"
    });

    useEffect(() => {
        const filled = savedAchievements.map((s) => ({ achievement: s.achievement ?? "" }));
        if (filled.length === 0) {
            replace([{ achievement: "" }]);
        } else {
            replace(filled);
        }
    }, [savedAchievements, replace]);

    const handleSave = async () => {
        if (!control) return;

        // Get current values from the form
        const achievements = fields.map((_, i) => {
            const fieldName = `achievements.${i}.achievement`;
            const value = (control as any)._formValues?.achievements?.[i]?.achievement || "";
            return { achievement: value };
        });

        await onSave(achievements);
    };

    return (
        <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Special Achievements (Global)</h3>

            <div className="space-y-2">
                {fields.map((f, i) => {
                    return (
                        <div key={f.id} className="flex items-center gap-2">
                            <Input
                                {...(register ? register(`achievements.${i}.achievement`) : {})}
                                defaultValue={(f as any).achievement}
                                placeholder="Achievement"
                                disabled={disabled}
                            />

                            <Button
                                type="button"
                                variant="destructive"
                                onClick={async () => {
                                    // if there's a corresponding savedAchievements[i] with id, delete it from server too (best-effort)
                                    const corresponding = savedAchievements[i];
                                    if (corresponding && corresponding.id && onDelete) {
                                        await onDelete(corresponding.id);
                                    }
                                    remove(i);
                                }}
                                disabled={disabled}
                            >
                                Remove
                            </Button>
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-3 justify-center items-center">
                <Button
                    type="button"
                    onClick={() => append({ achievement: "" })}
                    disabled={disabled}
                >
                    Add Item
                </Button>

                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={disabled}
                >
                    Save Achievements
                </Button>
            </div>
        </div>
    );
}