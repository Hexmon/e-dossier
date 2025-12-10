import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { pageOne, pageTwo } from "@/constants/app.constants";

interface Props {
    form: UseFormReturn<any>;
}

export default function PLCdrCombinedForm({ form }: Props) {
    const { register } = form;

    return (
        <div className="border p-4 rounded-xl space-y-6">
            <h3 className="font-semibold text-xl mb-3">PL CDR – Complete Form</h3>

            {/* PAGE 1 */}
            <div>

                {pageOne.map(({ key, label }) => (
                    <div key={key} className="mb-4">
                        <label className="block font-medium mb-1">{label}</label>
                        <Input {...register(key)} placeholder="Enter details..." />
                    </div>
                ))}
            </div>

            {/* PAGE 2 */}
            <div>

                {pageTwo.map(({ key, label }) => (
                    <div key={key} className="mb-4">
                        <label className="block font-medium mb-1">{label}</label>
                        <Input {...register(key)} placeholder="Enter details..." />
                    </div>
                ))}
            </div>
        </div>
    );
}
