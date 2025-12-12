"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

type Entry = {
    title?: string;
    marks?: string;
    remarks?: string;
};

type MiniProjectValues = {
    participation?: string;
    entries?: Entry[];
    specialAptitude?: string;
};

const STORAGE_KEY = "academics_miniproject";

export default function MiniProjectForm() {
    const { register, handleSubmit, reset } = useForm<MiniProjectValues>({
        defaultValues: {
            participation: "",
            entries: Array.from({ length: 6 }, () => ({ title: "", marks: "", remarks: "" })),
            specialAptitude: "",
        },
    });

    const [isSaved, setIsSaved] = useState<boolean>(false);

    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw) as MiniProjectValues;
                reset(parsed);
                setIsSaved(true);
            } catch {
                // ignore
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function onSubmit(values: MiniProjectValues): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
            setIsSaved(true);
            // eslint-disable-next-line no-console
            console.log("Mini Project saved:", values);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            alert("Failed to save");
        }
    }

    function handleEdit() {
        setIsSaved(false);
    }

    function handleReset() {
        localStorage.removeItem(STORAGE_KEY);
        reset({
            participation: "",
            entries: Array.from({ length: 6 }, () => ({ title: "", marks: "", remarks: "" })),
            specialAptitude: "",
        });
        setIsSaved(false);
    }

    return (
        <form key={isSaved ? "saved" : "editing"} onSubmit={handleSubmit(onSubmit)} className="border rounded-lg p-4 bg-white">
            <h4 className="font-semibold mb-4">Mini Project (VI Term)</h4>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Mini Project Participation</label>
                <textarea
                    {...register("participation")}
                    className="w-full min-h-[160px] border p-2 rounded"
                    placeholder="Describe involvement..."
                    disabled={isSaved}
                />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse mb-4">
                    <thead>
                        <tr>
                            <th className="border px-2 py-2">S No.</th>
                            <th className="border px-2 py-2">Sub</th>
                            <th className="border px-2 py-2">Mks</th>
                            <th className="border px-2 py-2">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 6 }).map((_, idx) => {
                            const base = `entries.${idx}` as const;
                            return (
                                <tr key={idx}>
                                    <td className="border px-2 py-1">{idx + 1}</td>
                                    <td className="border px-2 py-1">
                                        <input {...register(`${base}.title`)} className="w-full border px-1 py-0.5 rounded" disabled={isSaved} />
                                    </td>
                                    <td className="border px-2 py-1 flex justify-center">
                                        <input {...register(`${base}.marks`)} className="w-full border px-1 py-0.5 rounded" disabled={isSaved} />
                                    </td>
                                    <td className="border px-2 py-1">
                                        <input {...register(`${base}.remarks`)} className="w-full border px-1 py-0.5 rounded" disabled={isSaved} />
                                    </td>
                                </tr>
                            );
                        })}

                        <tr>
                            <td className="border px-2 py-1" colSpan={3}>
                                Total
                            </td>
                            <td className="border px-2 py-1"></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Special Aptitude Displayed (if any)</label>
                <textarea {...register("specialAptitude")} className="w-full border p-2 rounded min-h-[100px]" disabled={isSaved} />
            </div>

            <div className="flex gap-3 itesm-center justify-center">
                {isSaved ? (
                    <button type="button" onClick={handleEdit} className="px-4 py-2 rounded bg-yellow-500 text-black">
                        Edit
                    </button>
                ) : (
                    <>
                        <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">
                            Save Mini Project
                        </button>
                        <button type="button" onClick={handleReset} className="px-4 py-2 rounded bg-gray-200">
                            Reset
                        </button>
                    </>
                )}
            </div>
        </form>
    );
}
