"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UseFormRegister, FieldValues } from "react-hook-form";
import { OlqSubtitle } from "@/types/olq";

interface Props<T extends FieldValues> {
    register: UseFormRegister<T>;
    structure: Record<string, readonly OlqSubtitle[]>;
    onSubmit: (e?: any) => void;
    onClear: () => void;
    onDeleteSemester?: () => void;
    onReset?: () => void;
    showDelete?: boolean;
}

export default function OLQForm<T extends FieldValues>({
    register,
    structure,
    onSubmit,
    onClear,
    onDeleteSemester,
    onReset,
    showDelete = false,
}: Props<T>) {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            {Object.entries(structure).map(([remark, subtitles]) => (
                <div key={remark} className="border rounded p-4">
                    <h3 className="font-semibold mb-3">{remark}</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            {subtitles.map((s) => (
                                <div key={s.id} className="p-2 rounded bg-gray-50 border">{s.name}</div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {subtitles.map((s) => (
                                <Input
                                    key={s.id}
                                    type="number"
                                    {...register(s.id as any)}
                                    placeholder="Marks"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ))}

            <div className="flex justify-center gap-4">
                <Button type="submit" className="w-40">Submit</Button>
                {/* <Button type="button" variant="outline" onClick={onClear} className="w-40">Clear</Button> */}
                <Button type="button" variant="ghost" onClick={onReset} className="w-40">Reset</Button>
            </div>
        </form>
    );
}
