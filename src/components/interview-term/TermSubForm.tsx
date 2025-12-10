"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FieldDef } from "@/types/interview-term";

interface Props {
    form: UseFormReturn<Record<string, string>>;
    termIndex: number;
    variant: "beginning" | "postmid" | "special";
    fields: FieldDef[];
}

/**
 * TermSubForm
 * - uses destructuring for props
 * - registers inputs using keys scoped by term + variant
 * - fallback for values using ?? ""
 */
export default function TermSubForm({ form, termIndex, variant, fields }: Props) {
    const { register, getValues } = form;

    // prefix keys so each term/variant form uses distinct fields
    const prefix = `term${termIndex}_${variant}_`;

    // scoped keys for extra fields
    const dateKey = `${prefix}date`;
    const interviewedByKey = `${prefix}interviewedBy`;

    // fallback values
    const dateValue = (getValues(dateKey) as string) ?? "";
    const interviewedByValue = (getValues(interviewedByKey) as string) ?? "";

    return (
        <div className="border rounded-lg p-4 bg-white">
            <h4 className="font-semibold mb-4">
                {`Term ${termIndex} — ${variant === "beginning" ? "Beginning of Term" : variant === "postmid" ? "Post Mid Term" : "Special"}`}
            </h4>

            {/* Date field */}
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Date</label>
                <Input
                    type="date"
                    {...register(dateKey)}
                    defaultValue={dateValue}
                />
            </div>

            {/* main mapped fields */}
            {fields.map(({ key, label }) => {
                const scopedKey = `${prefix}${key}`;
                const value = (getValues(scopedKey) as string) ?? "";

                return (
                    <div key={scopedKey} className="mb-4">
                        <label className="block text-sm font-medium mb-1">{label}</label>

                        {/* use defaultValue so react-hook-form remains uncontrolled until registered */}
                        <Input
                            {...register(scopedKey)}
                            placeholder={label}
                            className="h-28"
                            defaultValue={value}
                        />
                    </div>
                );
            })}
            {/* Interviewed by field */}
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Interviewed by (Name & Appt)</label>
                <Input
                    {...register(interviewedByKey)}
                    placeholder="Name & Appointment"
                    defaultValue={interviewedByValue}
                />
            </div>
        </div>
    );
}
