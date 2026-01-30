// components/academics/AcademicTable.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAcademics } from "@/hooks/useAcademics";
import { toast } from "sonner";

export type AcademicRow = {
    subjectId: string;
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
    practicalTotal: string;
    practicalRemarks: string;
    practicalExam?: string | null;
    practicalCredit?: string | number | null;
    practicalGrade: string;
};

interface AcademicTableProps {
    ocId: string;
    semester: number;
    rows: AcademicRow[];
    totalCredits?: string | number;
    title?: string;
}

export default function AcademicTable({
    ocId,
    semester,
    rows,
    totalCredits = "",
    title = ""
}: AcademicTableProps) {
    const {
        loading,
        error,
        getSpecificSemester,
        updateSemesterGPA,
        updateSubjectMarks
    } = useAcademics(ocId);

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
                practicalTotal: "",
                practicalRemarks: "",
                practicalExam: "Practical",
                practicalCredit: "",
                practicalGrade: ""
            })),
        [rows]
    );

    const [data, setData] = useState<RowState[]>(initialState);
    const [isSaved, setIsSaved] = useState(false);
    const [sgpa, setSgpa] = useState("");
    const [marksScored, setMarksScored] = useState("");
    const [cgpa, setCgpa] = useState("");
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const toNum = (v: string | number | undefined): number => {
        const n = parseFloat(String(v || "").replace(/[^\d.-]/g, ""));
        return Number.isFinite(n) ? n : 0;
    };

    const calculateValues = (rowData: RowState): RowState => {
        const sessional = toNum(rowData.phase1) + toNum(rowData.phase2) + toNum(rowData.tutorial);
        const total = sessional + toNum(rowData.final);
        const practicalTotal = toNum(rowData.practicalFinal) + toNum(rowData.practicalTutorial);

        return {
            ...rowData,
            sessional: sessional > 0 ? String(Math.round(sessional)) : "",
            total: total > 0 ? String(Math.round(total)) : "",
            practicalTotal: practicalTotal > 0 ? String(Math.round(practicalTotal)) : ""
        };
    };

    // Load data from backend
    useEffect(() => {
        const loadData = async () => {
            const semesterData = await getSpecificSemester(semester);

            console.log("Loaded semester data:", semesterData);

            if (!semesterData) {
                const initializedData = rows.map((row, idx) => ({
                    ...initialState[idx],
                    practicalExam: row.practicalExam || "Practical",
                    practicalCredit: row.practicalCredit || "",
                }));
                setData(initializedData);
                setIsSaved(false);
                setIsInitialLoad(false);
                return;
            }

            const { sgpa: backendSgpa, cgpa: backendCgpa, marksScored: backendMarks, subjects } = semesterData;

            console.log("Extracted subjects:", subjects);

            setSgpa(backendSgpa?.toString() || "");
            setCgpa(backendCgpa?.toString() || "");
            setMarksScored(backendMarks?.toString() || "");

            const updatedData = rows.map((row, idx) => {
                const subject = subjects?.find((s: any) => s.subject?.id === row.subjectId);
                const theory = subject?.theory;
                const practical = subject?.practical;

                console.log(`Row ${idx} - subjectId: ${row.subjectId}`, {
                    found: !!subject,
                    theory,
                    practical
                });

                const baseData = {
                    ...initialState[idx],
                    phase1: theory?.phaseTest1Marks?.toString() || "",
                    phase2: theory?.phaseTest2Marks?.toString() || "",
                    tutorial: theory?.tutorial?.toString() || "",
                    final: theory?.finalMarks?.toString() || "",
                    grade: theory?.grade?.toString() || "",
                    practicalFinal: practical?.finalMarks?.toString() || "",
                    practicalTutorial: practical?.tutorial?.toString() || "",
                    practicalGrade: practical?.grade?.toString() || "",
                    practicalExam: row.practicalExam || "Practical",
                    practicalCredit: row.practicalCredit || "",
                };

                // Calculate sessional and totals
                return calculateValues(baseData);
            });

            console.log("Updated data state:", updatedData);

            setData(updatedData);
            setIsSaved(true);
            setIsInitialLoad(false);
        };

        loadData();
    }, [semester, ocId, rows, initialState, getSpecificSemester]);

    const handleChange = (idx: number, key: keyof RowState, value: string) => {
        setData(prev => {
            const next = [...prev];
            const updatedRow = { ...next[idx], [key]: value };
            // Recalculate on change
            next[idx] = calculateValues(updatedRow);
            return next;
        });
    };

    const grandTotal = useMemo(() => {
        return data.reduce((sum, row) => sum + toNum(row.total) + toNum(row.practicalTotal), 0);
    }, [data]);

    const handleSave = async () => {
        const gpaSuccess = await updateSemesterGPA(semester, {
            sgpa: parseFloat(sgpa) || undefined,
            cgpa: parseFloat(cgpa) || undefined,
            marksScored: parseFloat(marksScored) || undefined,
        });

        if (!gpaSuccess) {
            toast.error("Failed to update semester GPA");
            return;
        }

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const state = data[i];

            const trimmedPhase1 = (state.phase1 ?? "").trim();
            const trimmedPhase2 = (state.phase2 ?? "").trim();
            const trimmedTutorial = (state.tutorial ?? "").trim();
            const trimmedFinal = (state.final ?? "").trim();
            const trimmedGrade = (state.grade ?? "").trim();
            const trimmedPracticalFinal = (state.practicalFinal ?? "").trim();
            const trimmedPracticalGrade = (state.practicalGrade ?? "").trim();
            const trimmedPracticalTutorial = (state.practicalTutorial ?? "").trim();

            const isTheoryEmpty =
                trimmedPhase1 === "" &&
                trimmedPhase2 === "" &&
                trimmedTutorial === "" &&
                trimmedFinal === "" &&
                trimmedGrade === "";

            const isPracticalEmpty =
                trimmedPracticalFinal === "" &&
                trimmedPracticalGrade === "" &&
                trimmedPracticalTutorial === "";

            if (isTheoryEmpty && isPracticalEmpty) {
                continue;
            }

            const marks = {
                theory: {
                    phaseTest1Marks: toNum(trimmedPhase1) || undefined,
                    phaseTest2Marks: toNum(trimmedPhase2) || undefined,
                    tutorial: trimmedTutorial || undefined,
                    finalMarks: toNum(trimmedFinal) || undefined,
                    grade: trimmedGrade || undefined,
                },
                practical: {
                    finalMarks: toNum(trimmedPracticalFinal) || undefined,
                    grade: trimmedPracticalGrade || undefined,
                    tutorial: trimmedPracticalTutorial || undefined,
                },
            };

            const success = await updateSubjectMarks(semester, row.subjectId, marks);
            if (!success) {
                toast.error(`Failed to update subject: ${row.subject}`);
                return;
            }
        }

        setIsSaved(true);
        toast.success("Data saved successfully!");
    };

    const handleEdit = () => {
        setIsSaved(false);
    };

    const handleReset = () => {
        setData(initialState);
        setSgpa("");
        setCgpa("");
        setMarksScored("");
        setIsSaved(false);
    };

    if (loading || isInitialLoad) {
        return <div className="p-4 text-center">Loading...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-600">Error: {error}</div>;
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
                        if (!state) return null;

                        return (
                            <React.Fragment key={r.subjectId}>
                                <tr>
                                    <td className="border px-2 py-1" rowSpan={2}>{idx + 1}</td>
                                    <td className="border px-2 py-1" rowSpan={2}>{r.subject}</td>
                                    <td className="border px-2 py-1">{r.exam || "Theory"}</td>
                                    <td className="border px-2 py-1">{r.credit || ""}</td>

                                    {(["phase1", "phase2", "tutorial"] as const).map(key => (
                                        <td key={key} className="border px-2 py-1">
                                            <input
                                                value={state[key]}
                                                disabled={isSaved}
                                                onChange={e => handleChange(idx, key, e.target.value)}
                                                className="w-full border px-1 rounded"
                                            />
                                        </td>
                                    ))}

                                    <td className="border px-2 py-1">
                                        <input value={state.sessional} disabled className="w-full border px-1 bg-gray-100" />
                                    </td>

                                    <td className="border px-2 py-1">
                                        <input
                                            value={state.final}
                                            disabled={isSaved}
                                            onChange={e => handleChange(idx, "final", e.target.value)}
                                            className="w-full border px-1 rounded"
                                        />
                                    </td>

                                    <td className="border px-2 py-1">
                                        <input
                                            value={state.practical}
                                            disabled
                                            className="w-full border px-1 rounded bg-gray-100"
                                        />
                                    </td>

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

                                <tr className="bg-gray-50">
                                    <td className="border px-2 py-1">
                                        {r.practicalExam || "Practical"}
                                    </td>

                                    <td className="border px-2 py-1">
                                        {r.practicalCredit || ""}
                                    </td>

                                    <td className="border px-2 py-1">
                                        <input
                                            value={state.practicalPhase1}
                                            disabled
                                            className="w-full border px-1 rounded bg-gray-100"
                                        />
                                    </td>
                                    <td className="border px-2 py-1">
                                        <input
                                            value={state.practicalPhase2}
                                            disabled
                                            className="w-full border px-1 rounded bg-gray-100"
                                        />
                                    </td>
                                    <td className="border px-2 py-1">
                                        <input
                                            value={state.practicalTutorial}
                                            disabled={isSaved}
                                            onChange={e => handleChange(idx, "practicalTutorial", e.target.value)}
                                            className="w-full border px-1 rounded"
                                        />
                                    </td>
                                    <td className="border px-2 py-1">
                                        <input
                                            value={state.practicalSessional}
                                            disabled
                                            className="w-full border px-1 rounded bg-gray-100"
                                        />
                                    </td>
                                    <td className="border px-2 py-1">
                                        <input
                                            value={state.practicalFinal}
                                            disabled={isSaved}
                                            onChange={e => handleChange(idx, "practicalFinal", e.target.value)}
                                            className="w-full border px-1 rounded"
                                        />
                                    </td>
                                    <td className="border px-2 py-1">
                                        <input
                                            value={state.practicalPractical}
                                            disabled
                                            className="w-full border px-1 rounded bg-gray-100"
                                        />
                                    </td>

                                    <td className="border px-2 py-1">
                                        <input value={state.practicalTotal} disabled className="w-full border px-1 bg-gray-100" />
                                    </td>

                                    <td className="border px-2 py-1">
                                        <input
                                            value={state.practicalGrade}
                                            disabled={isSaved}
                                            onChange={e => handleChange(idx, "practicalGrade", e.target.value)}
                                            className="w-full border px-1 rounded"
                                        />
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}

                    <tr>
                        <td className="border px-2 py-1" colSpan={3}>Total</td>
                        <td className="border px-2 py-1">{totalCredits}</td>
                        <td className="border px-2 py-1" colSpan={6}></td>
                        <td className="border px-2 py-1 font-bold">{Math.round(grandTotal)}</td>
                        <td className="border px-2 py-1"></td>
                    </tr>

                    <tr>
                        <td className="border px-2 py-1">SGPA</td>
                        <td className="border px-2 py-1" colSpan={11}>
                            <input
                                value={sgpa}
                                disabled={isSaved}
                                onChange={e => setSgpa(e.target.value)}
                                className="w-full border px-1 rounded"
                                placeholder="Enter SGPA"
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="border px-2 py-1">Marks(1350)</td>
                        <td className="border px-2 py-1" colSpan={11}>
                            <input
                                value={marksScored}
                                disabled={isSaved}
                                onChange={e => setMarksScored(e.target.value)}
                                className="w-full border px-1 rounded"
                                placeholder="Enter marks scored"
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="border px-2 py-1">CGPA</td>
                        <td className="border px-2 py-1" colSpan={11}>
                            <input
                                value={cgpa}
                                disabled={isSaved}
                                onChange={e => setCgpa(e.target.value)}
                                className="w-full border px-1 rounded"
                                placeholder="Enter CGPA"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="flex gap-3 mt-4 justify-center items-center">
                {isSaved ? (
                    <button onClick={handleEdit} className="px-4 py-2 bg-blue-600 !text-white rounded">
                        Edit
                    </button>
                ) : (
                    <>
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>
                            {loading ? "Saving..." : "Save"}
                        </button>
                        <button onClick={handleReset} className="px-4 py-2 bg-gray-300 rounded">
                            Reset
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}