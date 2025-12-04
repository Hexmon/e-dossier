"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    UseFormRegister,
    FieldArrayWithId,
} from "react-hook-form";
import { FormValues } from "@/types/club-detls";

interface Props {
    register: UseFormRegister<FormValues>;
    fields: FieldArrayWithId<FormValues, "clubRows", "id">[];
    onSubmit?: (e?: any) => void;
    onReset?: () => void;
    disabled?: boolean;
    onEdit?: () => void;
}

export default function ClubForm({
    register,
    fields,
    onSubmit,
    onReset,
    disabled = false,
    onEdit
}: Props) {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="w-full border-collapse text-sm">
                    <thead className="bg-blue-50 text-gray-700">
                        <tr>
                            <th className="border p-2">Semester</th>
                            <th className="border p-2">Name of Club</th>
                            <th className="border p-2">Spl Achievement</th>
                            <th className="border p-2">Remarks</th>
                        </tr>
                    </thead>

                    <tbody>
                        {fields.map((f, idx) => {
                            const { id} = f;
                            return (
                                <tr key={id ?? idx}>

                                    <input type="hidden"
                                        {...register(`clubRows.${idx}.id` as const)}
                                    />

                                    <td className="border p-2">
                                        <Input
                                            {...register(`clubRows.${idx}.semester` as const)}
                                            readOnly
                                            disabled
                                            className="bg-gray-100 cursor-not-allowed"
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <Input
                                            {...register(`clubRows.${idx}.clubName` as const)}
                                            disabled={disabled}
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <Input
                                            {...register(`clubRows.${idx}.splAchievement` as const)}
                                            disabled={disabled}
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <Input
                                            {...register(`clubRows.${idx}.remarks` as const)}
                                            disabled={disabled}
                                        />
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {disabled ? (
                <div className="flex justify-center mt-4">
                    <Button
                        type="button"
                        className="bg-blue-600 text-white"
                        onClick={onEdit}
                    >
                        Edit Club
                    </Button>
                </div>
            ) : (
                <div className="flex justify-center gap-4 mt-6">
                    <Button type="submit" className="bg-blue-600 text-white">
                        Save Club
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onReset}
                    >
                        Reset Club
                    </Button>
                </div>
            )}
        </form>
    );
}
