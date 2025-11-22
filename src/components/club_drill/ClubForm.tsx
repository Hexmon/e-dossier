"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    UseFormRegister,
    FieldArrayWithId,
    UseFormGetValues
} from "react-hook-form";
import { FormValues } from "@/types/club-detls";

interface Props {
    register: UseFormRegister<FormValues>;
    fields: FieldArrayWithId<FormValues, "clubRows", "id">[];
    getValues: UseFormGetValues<FormValues>;
    onSubmit: () => void;
    onReset: () => void;
}

export default function ClubForm({ register, fields, getValues, onSubmit, onReset }: Props) {
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();

                const values = getValues();
                onSubmit();
            }}
            className="space-y-6"
        >
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
                        {fields.map((f, idx) => (
                            <tr key={f.id}>
                                <td className="border p-2">
                                    <Input
                                        {...register(`clubRows.${idx}.semester`)}
                                        readOnly
                                        className="bg-gray-100 cursor-not-allowed"
                                    />
                                </td>
                                <td className="border p-2">
                                    <Input {...register(`clubRows.${idx}.clubName`)} />
                                </td>
                                <td className="border p-2">
                                    <Input {...register(`clubRows.${idx}.splAchievement`)} />
                                </td>
                                <td className="border p-2">
                                    <Input {...register(`clubRows.${idx}.remarks`)} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-center gap-4 mt-6">
                <Button type="submit" className="bg-blue-600 text-white">
                    Save Club
                </Button>
                <Button type="button" variant="outline" onClick={onReset}>
                    Reset Club
                </Button>
            </div>
        </form>
    );
}
