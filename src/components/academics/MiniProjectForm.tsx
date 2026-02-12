// "use client";

// import React, { useEffect, useState } from "react";
// import { useForm } from "react-hook-form";
// import { useAcademics } from "@/hooks/useAcademics";
// import { toast } from "sonner";

// type Entry = {
//     title?: string;
//     marks?: string;
//     remarks?: string;
// };

// type MiniProjectValues = {
//     participation?: string;
//     entries?: Entry[];
//     specialAptitude?: string;
// };

// interface MiniProjectFormProps {
//     ocId: string;
// }

// export default function MiniProjectForm({ ocId }: MiniProjectFormProps) {
//     const { register, handleSubmit, reset } = useForm<MiniProjectValues>({
//         defaultValues: {
//             participation: "",
//             entries: Array.from({ length: 6 }, () => ({ title: "", marks: "", remarks: "" })),
//             specialAptitude: "",
//         },
//     });

//     const { loading, error, getSpecificSemester, updateSubjectMarks } = useAcademics(ocId);
//     const [isSaved, setIsSaved] = useState<boolean>(false);

//     useEffect(() => {
//         const loadData = async () => {
//             const semesterData = await getSpecificSemester(6);
//             if (!semesterData) return;

//             // Updated: Use the new structure with subject.name
//             const miniProjectSubject = semesterData.subjects.find(
//                 s => s.subject.name.toLowerCase().includes("proj")
//             );

//             if (miniProjectSubject?.theory) {
//                 const formData: MiniProjectValues = {
//                     participation: miniProjectSubject.theory.tutorial || "",
//                     entries: Array.from({ length: 6 }, () => ({ title: "", marks: "", remarks: "" })),
//                     specialAptitude: "",
//                 };

//                 reset(formData);
//                 setIsSaved(true);
//             }
//         };

//         loadData();
//     }, [ocId, reset, getSpecificSemester]);

//     const onSubmit = async (values: MiniProjectValues) => {
//         try {
//             const semesterData = await getSpecificSemester(6);
//             if (!semesterData) {
//                 toast.error("Failed to fetch semester data");
//                 return;
//             }

//             // Updated: Use the new structure
//             const miniProjectSubject = semesterData.subjects.find(
//                 s => s.subject.name.toLowerCase().includes("proj")
//             );

//             if (!miniProjectSubject) {
//                 toast.error("Mini Project subject not found");
//                 return;
//             }

//             // Updated: Use offeringId instead of subjectId
//             const success = await updateSubjectMarks(6, miniProjectSubject.offeringId, {
//                 theory: {
//                     tutorial: values.participation,
//                 },
//             });

//             if (success) {
//                 setIsSaved(true);
//                 toast.success("Mini Project saved successfully!");
//             } else {
//                 toast.error("Failed to save Mini Project");
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
//         reset({
//             participation: "",
//             entries: Array.from({ length: 6 }, () => ({ title: "", marks: "", remarks: "" })),
//             specialAptitude: "",
//         });
//         setIsSaved(false);
//     };

//     if (loading) {
//         return <div className="p-4 text-center">Loading...</div>;
//     }

//     if (error) {
//         return <div className="p-4 text-center text-destructive">Error: {error}</div>;
//     }

//     return (
//         <form
//             key={isSaved ? "saved" : "editing"}
//             onSubmit={handleSubmit(onSubmit)}
//             className="border rounded-lg p-4 bg-white"
//         >
//             <h4 className="font-semibold mb-4">Mini Project (VI Term)</h4>

//             <div className="mb-4">
//                 <label className="block text-sm font-medium mb-1">Mini Project Participation</label>
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
//                             <th className="border px-2 py-2">Mks</th>
//                             <th className="border px-2 py-2">Remarks</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {Array.from({ length: 6 }).map((_, idx) => {
//                             const base = `entries.${idx}` as const;
//                             return (
//                                 <tr key={idx}>
//                                     <td className="border px-2 py-1">{idx + 1}</td>
//                                     <td className="border px-2 py-1">
//                                         <input
//                                             {...register(`${base}.title`)}
//                                             className="w-full border px-1 py-0.5 rounded"
//                                             disabled={isSaved}
//                                         />
//                                     </td>
//                                     <td className="border px-2 py-1 flex justify-center">
//                                         <input
//                                             {...register(`${base}.marks`)}
//                                             className="w-full border px-1 py-0.5 rounded"
//                                             disabled={isSaved}
//                                         />
//                                     </td>
//                                     <td className="border px-2 py-1">
//                                         <input
//                                             {...register(`${base}.remarks`)}
//                                             className="w-full border px-1 py-0.5 rounded"
//                                             disabled={isSaved}
//                                         />
//                                     </td>
//                                 </tr>
//                             );
//                         })}

//                         <tr>
//                             <td className="border px-2 py-1" colSpan={3}>Total</td>
//                             <td className="border px-2 py-1"></td>
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

//             <div className="flex gap-3 items-center justify-center">
//                 {isSaved ? (
//                     <button
//                         type="button"
//                         onClick={handleEdit}
//                         className="px-4 py-2 rounded bg-warning text-foreground"
//                     >
//                         Edit
//                     </button>
//                 ) : (
//                     <>
//                         <button
//                             type="submit"
//                             className="px-4 py-2 rounded bg-primary text-primary-foreground"
//                             disabled={loading}
//                         >
//                             {loading ? "Saving..." : "Save Mini Project"}
//                         </button>
//                         <button
//                             type="button"
//                             onClick={handleReset}
//                             className="px-4 py-2 rounded bg-muted"
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

interface MiniProjectFormProps {
    ocId: string;
}

export default function MiniProjectForm({ ocId }: MiniProjectFormProps) {
    const { register, handleSubmit, reset, watch } = useForm<MiniProjectValues>({
        defaultValues: {
            participation: "",
            entries: Array.from({ length: 6 }, () => ({ title: "", marks: "", remarks: "" })),
            specialAptitude: "",
        },
    });

    const [isSaved, setIsSaved] = useState<boolean>(false);
    const [totalMarks, setTotalMarks] = useState<number>(0);

    // Watch entries to calculate total
    const entries = watch("entries");

    // Calculate total marks whenever entries change
    useEffect(() => {
        if (!entries) return;

        let total = 0;
        entries.forEach((entry) => {
            const marks = entry?.marks;
            if (marks) {
                total += parseFloat(String(marks)) || 0;
            }
        });
        setTotalMarks(total);
    }, [entries]);

    // Initialize form on mount
    useEffect(() => {
        const formData: MiniProjectValues = {
            participation: "",
            entries: Array.from({ length: 6 }, () => ({ title: "", marks: "", remarks: "" })),
            specialAptitude: "",
        };

        reset(formData);
        setIsSaved(false);
    }, [ocId, reset]);

    const onSubmit = async (values: MiniProjectValues) => {
        try {
            // Just save locally, no backend call
            setIsSaved(true);
            toast.success("Mini Project saved successfully!");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        }
    };

    const handleEdit = () => {
        setIsSaved(false);
    };

    const handleReset = () => {
        reset({
            participation: "",
            entries: Array.from({ length: 6 }, () => ({ title: "", marks: "", remarks: "" })),
            specialAptitude: "",
        });
        setIsSaved(false);
        setTotalMarks(0);
    };

    return (
        <form
            key={isSaved ? "saved" : "editing"}
            onSubmit={handleSubmit(onSubmit)}
            className="border rounded-lg p-4 bg-white"
        >
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
                                        <input
                                            {...register(`${base}.title`)}
                                            className="w-full border px-1 py-0.5 rounded"
                                            placeholder="Title"
                                            disabled={isSaved}
                                        />
                                    </td>
                                    <td className="border px-2 py-1">
                                        <input
                                            {...register(`${base}.marks`)}
                                            type="number"
                                            className="w-full border px-1 py-0.5 rounded"
                                            placeholder="Marks"
                                            disabled={isSaved}
                                        />
                                    </td>
                                    <td className="border px-2 py-1">
                                        <input
                                            {...register(`${base}.remarks`)}
                                            className="w-full border px-1 py-0.5 rounded"
                                            placeholder="Remarks"
                                            disabled={isSaved}
                                        />
                                    </td>
                                </tr>
                            );
                        })}

                        <tr>
                            <td className="border px-2 py-1" colSpan={2}>Total</td>
                            <td className="border px-2 py-1 font-bold text-center">{totalMarks}</td>
                            <td className="border px-2 py-1"></td>
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
                    placeholder="Describe any special aptitude..."
                    disabled={isSaved}
                />
            </div>

            <div className="flex gap-3 items-center justify-center">
                {isSaved ? (
                    <button
                        type="button"
                        onClick={handleEdit}
                        className="px-4 py-2 rounded bg-warning text-foreground"
                    >
                        Edit
                    </button>
                ) : (
                    <>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded bg-primary text-primary-foreground"
                        >
                            Save Mini Project
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-4 py-2 rounded bg-muted"
                        >
                            Reset
                        </button>
                    </>
                )}
            </div>
        </form>
    );
}