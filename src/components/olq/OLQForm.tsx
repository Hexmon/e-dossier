// /components/olq/OLQForm.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UseFormRegister } from "react-hook-form";

/**
 * structure: Record<string, Subtitle[]> where Subtitle is backend subtitle object:
 *   { id: string, subtitle: string, maxMarks?: number }
 */
interface Props {
    register: UseFormRegister<any>;
    structure: Record<string, any[]>;
    onSubmit: () => void;
    onClear: () => void;
    showDelete?: boolean;
    onReset?: () => void;
    onDeleteSemester?: () => void;
}

export default function OLQForm({ register, structure, onSubmit, onClear, showDelete = false, onReset, onDeleteSemester }: Props) {
    return (
        <form
            onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
            className="space-y-6"
        >
            {Object.entries(structure).map(([title, subtitles]) => {
                return (
                    <div key={title} className="border rounded p-4">
                        <h3 className="font-semibold mb-3">{title}</h3>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                {subtitles.map((s: any) => (
                                    <div key={s.id} className="p-2 rounded bg-muted/40 border">
                                        {s.subtitle}
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                {subtitles.map((s: any) => (
                                    <Input
                                        key={s.id}
                                        type="number"
                                        min={0}
                                        max={s.maxMarks ?? 100}
                                        placeholder="Marks"
                                        {...register(s.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )
            })}

            <div className="flex justify-center gap-4">
                <Button type="submit" className="w-40">Submit</Button>
                <Button type="button" variant="outline" className="w-40" onClick={onClear}>Clear</Button>
                {/* {onReset && (
                    <Button type="button" variant="ghost" className="w-40" onClick={onReset}>Reset Form</Button>
                )}
                {showDelete && onDeleteSemester && (
                    <Button type="button" variant="destructive" className="w-40" onClick={onDeleteSemester}>Delete Semester</Button>
                )} */}
            </div>
        </form>
    );
}
