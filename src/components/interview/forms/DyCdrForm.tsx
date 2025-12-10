import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Initialrows } from "@/constants/app.constants";

interface Props { form: UseFormReturn<any> }

export default function DyCdrForm({ form }: Props) {
    const { register } = form;

    return (
        <div className="border p-4 rounded-xl">
            <h3 className="font-semibold text-lg mb-3">DY CDR</h3>

            {Initialrows.map(({ key, label }) => (
                <div key={key} className="mb-4">
                    <label className="block font-medium mb-1">{label}</label>
                    <Input {...register(key)} placeholder="Enter details..." />
                </div>
            ))}
        </div>
    );
}
