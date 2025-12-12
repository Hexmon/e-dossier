"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

const criteria = [
    "Coverage and depth of literature survey",
    "New Ideas, logic & analytical content",
    "Structuring & Presentation",
    "Depth of rig of content",
    "Level of participation and confidence",
    "Trg Aids/ Ref used",
    "Ability to answer question from audience",
    "Proj Report",
] as const;

const weights = [50, 30, 20, 30, 30, 20, 20, 100] as const;

type MarksItem = {
    score?: string | number;
    remark?: string;
};

type TechSeminarValues = {
    participation?: string;
    marks?: Record<string, MarksItem>;
    specialAptitude?: string;
};

const STORAGE_KEY = "academics_techseminar";

export default function TechSeminarForm() {
    const { register, handleSubmit, reset, setValue, getValues } = useForm<TechSeminarValues>({
        defaultValues: { participation: "", marks: {}, specialAptitude: "" },
    });

    const [isSaved, setIsSaved] = useState<boolean>(false);

    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw) as TechSeminarValues;
                reset(parsed);
                setIsSaved(true);
            } catch {
                // ignore parse
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function onSubmit(values: TechSeminarValues): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
            setIsSaved(true);
            // eslint-disable-next-line no-console
            console.log("Tech Seminar saved:", values);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            alert("Failed to save");
        }
    }

    function handleEdit() {
        setIsSaved(false);
        // keep values as-is; user can edit
    }

    function handleReset() {
        localStorage.removeItem(STORAGE_KEY);
        const base: TechSeminarValues = { participation: "", marks: {}, specialAptitude: "" };
        reset(base);
        setIsSaved(false);
    }

    return (
        <form key={isSaved ? "saved" : "editing"} onSubmit={handleSubmit(onSubmit)} className="border rounded-lg p-4 bg-white">
            <h4 className="font-semibold mb-4">Tech Seminar (V Term)</h4>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Tech Seminar Participation</label>
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
                            <th className="border px-2 py-2">Total Mks</th>
                            <th className="border px-2 py-2">Mks</th>
                            <th className="border px-2 py-2">Remarks</th>
                        </tr>
                    </thead>

                    <tbody>
                        {criteria.map((label, idx) => {
                            const key = label.replace(/\s+/g, "_");
                            const scoreName = `marks.${key}.score` as const;
                            const remarkName = `marks.${key}.remark` as const;

                            return (
                                <tr key={idx}>
                                    <td className="border px-2 py-1">{idx + 1}</td>
                                    <td className="border px-2 py-1">{label}</td>
                                    <td className="border px-2 py-1">{weights[idx] ?? ""}</td>

                                    <td className="border px-2 py-1">
                                        <input
                                            {...register(scoreName)}
                                            placeholder="marks"
                                            className="w-20 border px-1 py-0.5 rounded"
                                            disabled={isSaved}
                                        />
                                    </td>

                                    <td className="border px-2 py-1">
                                        <input
                                            {...register(remarkName)}
                                            placeholder="remark"
                                            className="w-full border px-1 py-0.5 rounded"
                                            disabled={isSaved}
                                        />
                                    </td>
                                </tr>
                            );
                        })}

                        <tr>
                            <td className="border px-2 py-1" colSpan={4}>
                                Total
                            </td>
                            <td className="border px-2 py-1">300</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Special Aptitude Displayed (if any)</label>
                <textarea {...register("specialAptitude")} className="w-full border p-2 rounded min-h-[100px]" disabled={isSaved} />
            </div>

            <div className="flex gap-3 justify-center items-center">
                {isSaved ? (
                    <button type="button" onClick={handleEdit} className="px-4 py-2 rounded bg-yellow-500 text-black">
                        Edit
                    </button>
                ) : (
                    <>
                        <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">
                            Save Tech Seminar
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
