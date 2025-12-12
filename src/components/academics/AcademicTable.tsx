// components/academics/AcademicTable.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

export type AcademicRow = {
    subject: string;
    exam?: string;
    credit?: string | number;
    practicalExam?: string | null;
    practicalCredit?: string | number | null;
};

type RowState = {
    phase1: string;
    phase2: string;
    tutorial: string;
    sessional: string;
    final: string;
    practical: string;
    total: string;
    grade: string;

    practicalPhase1: string;
    practicalPhase2: string;
    practicalTutorial: string;
    practicalSessional: string;
    practicalFinal: string;
    practicalPractical: string;
    practicalRemarks: string;

    practicalExam?: string | null;
    practicalCredit?: string | number | null;
    practicalGrade: string;   // ⭐ NEW — editable practical grade
};

interface AcademicTableProps {
    idKey: string;
    rows: AcademicRow[];
    totalCredits?: string | number;
    title?: string;
}

export default function AcademicTable({ rows, totalCredits = "", title = "", idKey }: AcademicTableProps) {

    const initialState = useMemo<RowState[]>(
        () =>
            rows.map(() => ({
                phase1: "",
                phase2: "",
                tutorial: "",
                sessional: "",
                final: "",
                practical: "",
                total: "",
                grade: "",
                practicalPhase1: "",
                practicalPhase2: "",
                practicalTutorial: "",
                practicalSessional: "",
                practicalFinal: "",
                practicalPractical: "",
                practicalRemarks: "",
                practicalExam: "Practical",
                practicalCredit: "",
                practicalGrade: ""          // ⭐ NEW
            })),
        [rows]
    );

    const storageKey = `academics_table_${idKey ?? title ?? "default"}`;

    const [data, setData] = useState<RowState[]>(initialState);
    const [isSaved, setIsSaved] = useState(false);

    // Load on mount
    useEffect(() => {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    setData(parsed);
                    setIsSaved(true);
                    return;
                }
            } catch { }
        }

        const seeded = rows.map((r, i) => ({
            ...initialState[i],
            practicalExam: r.practicalExam ?? "Practical",
            practicalCredit: r.practicalCredit ?? "",
        }));

        setData(seeded);
        setIsSaved(false);
    }, [storageKey, rows.length]);

    function toNum(v: any) {
        const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
        return Number.isFinite(n) ? n : 0;
    }

    // Total Auto Calculation
    useEffect(() => {
        setData(prev =>
            prev.map(row => {
                const sum =
                    toNum(row.phase1) +
                    toNum(row.phase2) +
                    toNum(row.tutorial) +
                    toNum(row.sessional) +
                    toNum(row.final) +
                    toNum(row.practicalPractical);

                return {
                    ...row,
                    total: String(Math.round(sum))
                };
            })
        );
    }, [data.length]);

    // handle input change
    function handleChange(idx: number, key: keyof RowState, value: string) {
        setData(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [key]: value };

            const r = next[idx];
            const sum =
                toNum(r.phase1) +
                toNum(r.phase2) +
                toNum(r.tutorial) +
                toNum(r.sessional) +
                toNum(r.final) +
                toNum(r.practicalPractical);

            next[idx].total = String(Math.round(sum));

            return next;
        });
    }

    function handleSave() {
        localStorage.setItem(storageKey, JSON.stringify(data));
        setIsSaved(true);
    }

    function handleEdit() {
        setIsSaved(false);
    }

    function handleReset() {
        localStorage.removeItem(storageKey);

        const seeded = rows.map((r, i) => ({
            ...initialState[i],
            practicalExam: r.practicalExam ?? "Practical",
            practicalCredit: r.practicalCredit ?? "",
        }));

        setData(seeded);
        setIsSaved(false);
    }

    return (
        <div className="overflow-x-auto">
            {title && <h4 className="font-medium mb-3">{title}</h4>}

            <table className="w-full table-auto border-collapse">
                <thead>
                    <tr>
                        <th className="border px-2 py-2 bg-gray-50">S No.</th>
                        <th className="border px-2 py-2 bg-gray-50">Sub</th>
                        <th className="border px-2 py-2 bg-gray-50">Exam</th>
                        <th className="border px-2 py-2 bg-gray-50">Credit</th>
                        <th className="border px-2 py-2 bg-gray-50">Phase I</th>
                        <th className="border px-2 py-2 bg-gray-50">Phase II</th>
                        <th className="border px-2 py-2 bg-gray-50">Tutorial</th>
                        <th className="border px-2 py-2 bg-gray-50">Sessional</th>
                        <th className="border px-2 py-2 bg-gray-50">Final</th>
                        <th className="border px-2 py-2 bg-gray-50">Practical</th>
                        <th className="border px-2 py-2 bg-gray-50">Total</th>
                        <th className="border px-2 py-2 bg-gray-50">Grade</th>
                    </tr>
                </thead>

                <tbody>
                    {rows.map((r, idx) => {
                        const state = data[idx];

                        return (
                            <React.Fragment key={idx}>

                                {/* THEORY ROW */}
                                <tr>
                                    <td className="border px-2 py-1" rowSpan={2}>{idx + 1}</td>
                                    <td className="border px-2 py-1" rowSpan={2}>{r.subject}</td>

                                    <td className="border px-2 py-1">{r.exam ?? "Theory"}</td>
                                    <td className="border px-2 py-1">{r.credit ?? ""}</td>

                                    {["phase1", "phase2", "tutorial", "sessional", "final", "practical"].map(key => (
                                        <td key={key} className="border px-2 py-1">
                                            <input
                                                value={state[key as keyof RowState] as string}
                                                disabled={isSaved}
                                                onChange={e => handleChange(idx, key as keyof RowState, e.target.value)}
                                                className="w-full border px-1 rounded"
                                            />
                                        </td>
                                    ))}

                                    <td className="border px-2 py-1">
                                        <input value={state.total} disabled className="w-full border px-1 bg-gray-100" />
                                    </td>

                                    <td className="border px-2 py-1">
                                        <input
                                            value={state.grade}
                                            disabled={isSaved}
                                            onChange={e => handleChange(idx, "grade", e.target.value)}
                                            className="w-full border px-1 rounded"
                                        />
                                    </td>
                                </tr>

                                {/* PRACTICAL ROW */}
                                <tr className="bg-gray-50">

                                    {/* EXAM */}
                                    <td className="border px-2 py-1">
                                        <input
                                            value={state.practicalExam ?? ""}
                                            disabled={isSaved}
                                            onChange={e => handleChange(idx, "practicalExam", e.target.value)}
                                            className="w-full border px-1 rounded"
                                        />
                                    </td>

                                    {/* CREDIT — NOW FULLY EDITABLE */}
                                    <td className="border px-2 py-1">
                                        <input
                                            value={state.practicalCredit ?? ""}
                                            disabled={isSaved}
                                            onChange={e => handleChange(idx, "practicalCredit", e.target.value)}
                                            className="w-full border px-1 rounded"
                                            inputMode="decimal"
                                        />
                                    </td>

                                    {/* PRACTICAL MARK FIELDS */}
                                    {[
                                        "practicalPhase1",
                                        "practicalPhase2",
                                        "practicalTutorial",
                                        "practicalSessional",
                                        "practicalFinal",
                                        "practicalPractical",
                                    ].map(key => (
                                        <td key={key} className="border px-2 py-1">
                                            <input
                                                value={state[key as keyof RowState] as string}
                                                disabled={isSaved}
                                                onChange={e => handleChange(idx, key as keyof RowState, e.target.value)}
                                                className="w-full border px-1 rounded"
                                            />
                                        </td>
                                    ))}

                                    {/* PRACTICAL GRADE — NEW FIELD */}
                                    <td className="border px-2 py-1">
                                        <input
                                            value={state.practicalGrade}
                                            disabled={isSaved}
                                            onChange={e => handleChange(idx, "practicalGrade", e.target.value)}
                                            className="w-full border px-1 rounded"
                                        />
                                    </td>

                                    {/* REMARKS */}
                                    <td className="border px-2 py-1" colSpan={1}>
                                        <input
                                            value={state.practicalRemarks}
                                            disabled={isSaved}
                                            onChange={e => handleChange(idx, "practicalRemarks", e.target.value)}
                                            className="w-full border px-1 rounded"
                                        />
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}

                    {/* FOOTER */}
                    <tr>
                        <td className="border px-2 py-1" colSpan={3}>Total</td>
                        <td className="border px-2 py-1">{totalCredits}</td>
                        <td className="border px-2 py-1" colSpan={8}></td>
                    </tr>

                    <tr>
                        <td className="border px-2 py-1">SGPA</td>
                        <td className="border px-2 py-1" colSpan={11}></td>
                    </tr>
                    <tr>
                        <td className="border px-2 py-1">Marks(1350)</td>
                        <td className="border px-2 py-1" colSpan={11}></td>
                    </tr>
                    <tr>
                        <td className="border px-2 py-1">CGPA</td>
                        <td className="border px-2 py-1" colSpan={11}></td>
                    </tr>
                </tbody>
            </table>

            <div className="flex gap-3 mt-4 justify-center items-center">
                {isSaved ? (
                    <button onClick={handleEdit} className="px-4 py-2 bg-yellow-500 rounded">Edit</button>
                ) : (
                    <>
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
                        <button onClick={handleReset} className="px-4 py-2 bg-gray-300 rounded">Reset</button>
                    </>
                )}
            </div>
        </div>
    );
}
