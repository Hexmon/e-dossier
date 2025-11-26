"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UseFormRegister, FieldArrayWithId } from "react-hook-form";
import { FormValues } from "@/types/club-detls";

interface Props {
    register: UseFormRegister<FormValues>;
    fields: FieldArrayWithId<FormValues, "drillRows", "id">[];
    onSubmit?: (e?: any) => void;
    onReset?: () => void;
    disabled?: boolean;
    onEdit?: () => void;
}

export default function DrillForm({ register, fields, onSubmit, onReset, disabled = false, onEdit }: Props) {
    return (
        <form onSubmit={onSubmit ?? ((e) => e.preventDefault())} className="space-y-6">

            <div className="text-center font-semibold underline text-primary text-lg mt-6">
                ASSESSMENT : DRILL
            </div>

            <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="w-full border-collapse text-sm">
                    <thead className="bg-blue-50 text-gray-700">
                        <tr>
                            <th className="border p-2">Semester</th>
                            <th className="border p-2">Max Mks</th>
                            <th className="border p-2">M1</th>
                            <th className="border p-2">M2</th>
                            <th className="border p-2">A1/C1</th>
                            <th className="border p-2">A2/C2</th>
                            <th className="border p-2">Remarks</th>
                        </tr>
                    </thead>

                    <tbody>
                        {fields.map((f, idx) => {
                            return (
                                <tr key={f.id ?? idx}>
                                    <input type="hidden" {...register(`drillRows.${idx}.id` as const)} />

                                    <td className="border p-2">
                                        <Input
                                            {...register(`drillRows.${idx}.semester` as const)}
                                            readOnly
                                            disabled
                                            className="bg-gray-100 cursor-not-allowed"
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <Input
                                            type="number"
                                            {...register(`drillRows.${idx}.maxMks` as const)}
                                            disabled={disabled}
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <Input
                                            type="number"
                                            {...register(`drillRows.${idx}.m1` as const)}
                                            disabled={disabled}
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <Input
                                            type="number"
                                            {...register(`drillRows.${idx}.m2` as const)}
                                            disabled={disabled}
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <Input
                                            type="number"
                                            {...register(`drillRows.${idx}.a1c1` as const)}
                                            disabled={disabled}
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <Input
                                            type="number"
                                            {...register(`drillRows.${idx}.a2c2` as const)}
                                            disabled={disabled}
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <Input
                                            {...register(`drillRows.${idx}.remarks` as const)}
                                            disabled={disabled}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {disabled ? (
                <div className="flex justify-center mt-4">
                    <Button type="button" className="bg-blue-600 text-white" onClick={onEdit}>
                        Edit Drill
                    </Button>
                </div>
            ) : (
                <div className="flex justify-center gap-4 mt-6">
                    <Button type="submit" className="bg-blue-600 text-white">
                        Save Drill
                    </Button>
                    <Button type="button" variant="outline" onClick={onReset}>
                        Reset Drill
                    </Button>
                </div>
            )}
        </form>
    );
}