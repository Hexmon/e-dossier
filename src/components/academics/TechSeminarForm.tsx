// "use client";

// import React, { useEffect, useState } from "react";
// import { useForm } from "react-hook-form";
// import { useAcademics } from "@/hooks/useAcademics";
// import { toast } from "sonner";

// const criteria = [
//     "Coverage and depth of literature survey",
//     "New Ideas, logic & analytical content",
//     "Structuring & Presentation",
//     "Depth of rig of content",
//     "Level of participation and confidence",
//     "Trg Aids/ Ref used",
//     "Ability to answer question from audience",
//     "Proj Report",
// ] as const;

// const weights = [50, 30, 20, 30, 30, 20, 20, 100] as const;

// type MarksItem = {
//     score?: string | number;
//     remark?: string;
// };

// type TechSeminarValues = {
//     participation?: string;
//     marks?: Record<string, MarksItem>;
//     specialAptitude?: string;
// };

// interface TechSeminarFormProps {
//     ocId: string;
// }

// export default function TechSeminarForm({ ocId }: TechSeminarFormProps) {
//     const { register, handleSubmit, reset } = useForm<TechSeminarValues>({
//         defaultValues: { participation: "", marks: {}, specialAptitude: "" },
//     });

//     const { loading, error, getSpecificSemester, updateSubjectMarks } = useAcademics(ocId);
//     const [isSaved, setIsSaved] = useState<boolean>(false);

//     useEffect(() => {
//         const loadData = async () => {
//             const semesterData = await getSpecificSemester(5);
//             if (!semesterData) return;

//             // Updated: Use the new structure with subject.name
//             const techSeminarSubject = semesterData.subjects.find(
//                 s => s.subject.name.toLowerCase().includes("tech seminar")
//             );

//             if (techSeminarSubject?.theory) {
//                 const formData: TechSeminarValues = {
//                     participation: techSeminarSubject.theory.tutorial || "",
//                     marks: {},
//                     specialAptitude: "",
//                 };

//                 criteria.forEach((label) => {
//                     const key = label.replace(/\s+/g, "_");
//                     formData.marks = formData.marks || {};
//                     formData.marks[key] = {
//                         score: "",
//                         remark: "",
//                     };
//                 });

//                 reset(formData);
//                 setIsSaved(true);
//             }
//         };

//         loadData();
//     }, [ocId, reset, getSpecificSemester]);

//     const onSubmit = async (values: TechSeminarValues) => {
//         try {
//             const semesterData = await getSpecificSemester(5);
//             if (!semesterData) {
//                 toast.error("Failed to fetch semester data");
//                 return;
//             }

//             // Updated: Use the new structure
//             const techSeminarSubject = semesterData.subjects.find(
//                 s => s.subject.name.toLowerCase().includes("tech seminar")
//             );

//             if (!techSeminarSubject) {
//                 toast.error("Tech Seminar subject not found");
//                 return;
//             }

//             // Updated: Use offeringId instead of subjectId
//             const success = await updateSubjectMarks(5, techSeminarSubject.offeringId, {
//                 theory: {
//                     tutorial: values.participation,
//                 },
//             });

//             if (success) {
//                 setIsSaved(true);
//                 toast.success("Tech Seminar saved successfully!");
//             } else {
//                 toast.error("Failed to save Tech Seminar");
//             }
//         } catch (e) {
//             console.error(e);
//             toast.error("Failed to save");
//         }
//     };

//     const handleEdit = () => {
//         setIsSaved(false);
//     };

//     const handleReset = () => {
//         const base: TechSeminarValues = { participation: "", marks: {}, specialAptitude: "" };
//         reset(base);
//         setIsSaved(false);
//     };

//     if (loading) {
//         return <div className="p-4 text-center">Loading...</div>;
//     }

//     if (error) {
//         return <div className="p-4 text-center text-red-600">Error: {error}</div>;
//     }

//     return (
//         <form
//             key={isSaved ? "saved" : "editing"}
//             onSubmit={handleSubmit(onSubmit)}
//             className="border rounded-lg p-4 bg-white"
//         >
//             <h4 className="font-semibold mb-4">Tech Seminar (V Term)</h4>

//             <div className="mb-4">
//                 <label className="block text-sm font-medium mb-1">Tech Seminar Participation</label>
//                 <textarea
//                     {...register("participation")}
//                     className="w-full min-h-[160px] border p-2 rounded"
//                     placeholder="Describe involvement..."
//                     disabled={isSaved}
//                 />
//             </div>

//             <div className="overflow-x-auto">
//                 <table className="w-full table-auto border-collapse mb-4">
//                     <thead>
//                         <tr>
//                             <th className="border px-2 py-2">S No.</th>
//                             <th className="border px-2 py-2">Sub</th>
//                             <th className="border px-2 py-2">Total Mks</th>
//                             <th className="border px-2 py-2">Mks</th>
//                             <th className="border px-2 py-2">Remarks</th>
//                         </tr>
//                     </thead>

//                     <tbody>
//                         {criteria.map((label, idx) => {
//                             const key = label.replace(/\s+/g, "_");
//                             const scoreName = `marks.${key}.score` as const;
//                             const remarkName = `marks.${key}.remark` as const;

//                             return (
//                                 <tr key={idx}>
//                                     <td className="border px-2 py-1">{idx + 1}</td>
//                                     <td className="border px-2 py-1">{label}</td>
//                                     <td className="border px-2 py-1">{weights[idx]}</td>

//                                     <td className="border px-2 py-1">
//                                         <input
//                                             {...register(scoreName)}
//                                             placeholder="marks"
//                                             className="w-20 border px-1 py-0.5 rounded"
//                                             disabled={isSaved}
//                                         />
//                                     </td>

//                                     <td className="border px-2 py-1">
//                                         <input
//                                             {...register(remarkName)}
//                                             placeholder="remark"
//                                             className="w-full border px-1 py-0.5 rounded"
//                                             disabled={isSaved}
//                                         />
//                                     </td>
//                                 </tr>
//                             );
//                         })}

//                         <tr>
//                             <td className="border px-2 py-1" colSpan={4}>Total</td>
//                             <td className="border px-2 py-1">300</td>
//                         </tr>
//                     </tbody>
//                 </table>
//             </div>

//             <div className="mb-4">
//                 <label className="block text-sm font-medium mb-1">
//                     Special Aptitude Displayed (if any)
//                 </label>
//                 <textarea
//                     {...register("specialAptitude")}
//                     className="w-full border p-2 rounded min-h-[100px]"
//                     disabled={isSaved}
//                 />
//             </div>

//             <div className="flex gap-3 justify-center items-center">
//                 {isSaved ? (
//                     <button
//                         type="button"
//                         onClick={handleEdit}
//                         className="px-4 py-2 rounded bg-yellow-500 text-black"
//                     >
//                         Edit
//                     </button>
//                 ) : (
//                     <>
//                         <button
//                             type="submit"
//                             className="px-4 py-2 rounded bg-blue-600 text-white"
//                             disabled={loading}
//                         >
//                             {loading ? "Saving..." : "Save Tech Seminar"}
//                         </button>
//                         <button
//                             type="button"
//                             onClick={handleReset}
//                             className="px-4 py-2 rounded bg-gray-200"
//                         >
//                             Reset
//                         </button>
//                     </>
//                 )}
//             </div>
//         </form>
//     );
// }


"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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

interface TechSeminarFormProps {
    ocId: string;
}

export default function TechSeminarForm({ ocId }: TechSeminarFormProps) {
    const { register, handleSubmit, reset, watch } = useForm<TechSeminarValues>({
        defaultValues: { participation: "", marks: {}, specialAptitude: "" },
    });

    const [isSaved, setIsSaved] = useState<boolean>(false);
    const [totalMarks, setTotalMarks] = useState<number>(0);

    // Watch all marks to calculate total
    const marksData = watch("marks");

    // Calculate total marks whenever marks change
    useEffect(() => {
        if (!marksData) return;

        let total = 0;
        criteria.forEach((label) => {
            const key = label.replace(/\s+/g, "_");
            const score = marksData[key]?.score;
            if (score) {
                total += parseFloat(String(score)) || 0;
            }
        });
        setTotalMarks(total);
    }, [marksData]);

    // Load data from local state on mount
    useEffect(() => {
        const formData: TechSeminarValues = {
            participation: "",
            marks: {},
            specialAptitude: "",
        };

        criteria.forEach((label) => {
            const key = label.replace(/\s+/g, "_");
            formData.marks = formData.marks || {};
            formData.marks[key] = {
                score: "",
                remark: "",
            };
        });

        reset(formData);
        setIsSaved(false);
    }, [ocId, reset]);

    const onSubmit = async (values: TechSeminarValues) => {
        try {
            // Just save locally, no backend call
            setIsSaved(true);
            toast.success("Tech Seminar saved successfully!");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        }
    };

    const handleEdit = () => {
        setIsSaved(false);
    };

    const handleReset = () => {
        const base: TechSeminarValues = {
            participation: "",
            marks: {},
            specialAptitude: ""
        };

        criteria.forEach((label) => {
            const key = label.replace(/\s+/g, "_");
            base.marks = base.marks || {};
            base.marks[key] = {
                score: "",
                remark: "",
            };
        });

        reset(base);
        setIsSaved(false);
        setTotalMarks(0);
    };

    return (
        <form
            key={isSaved ? "saved" : "editing"}
            onSubmit={handleSubmit(onSubmit)}
            className="border rounded-lg p-4 bg-white"
        >
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
                                    <td className="border px-2 py-1">{weights[idx]}</td>

                                    <td className="border px-2 py-1">
                                        <input
                                            {...register(scoreName)}
                                            placeholder="marks"
                                            type="number"
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
                            <td className="border px-2 py-1" colSpan={3}>Total</td>
                            <td className="border px-2 py-1 font-bold">{totalMarks}</td>
                            <td className="border px-2 py-1">out of 300</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                    Special Aptitude Displayed (if any)
                </label>
                <textarea
                    {...register("specialAptitude")}
                    className="w-full border p-2 rounded min-h-[100px]"
                    disabled={isSaved}
                />
            </div>

            <div className="flex gap-3 justify-center items-center">
                {isSaved ? (
                    <button
                        type="button"
                        onClick={handleEdit}
                        className="px-4 py-2 rounded bg-yellow-500 text-black"
                    >
                        Edit
                    </button>
                ) : (
                    <>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded bg-blue-600 text-white"
                        >
                            Save Tech Seminar
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-4 py-2 rounded bg-gray-200"
                        >
                            Reset
                        </button>
                    </>
                )}
            </div>
        </form>
    );
}