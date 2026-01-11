"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { RootState } from "@/store";
import { saveRelegations } from "@/store/slices/overallAssessmentSlice";

interface Relegation {
    id: string;
    dateOfRelegation: string;
    courseRelegatedTo: string;
    reason: string;
    isRowEditing?: boolean;
}

interface RelegationsProps {
    ocId: string;
}

export default function Relegations({ ocId }: RelegationsProps) {
    const dispatch = useDispatch();
    const [isEditing, setIsEditing] = useState(false);

    // Get saved data from Redux
    const savedData = useSelector((state: RootState) =>
        state.overallAssessment.forms[ocId]?.relegations
    );

    const [relegationData, setRelegationData] = useState<Relegation[]>(() =>
        savedData || []
    );

    // Debounce ref
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Load saved data when ocId changes
    useEffect(() => {
        if (savedData) {
            setRelegationData(savedData);
        }
    }, [ocId, savedData]);

    // Auto-save with debounce
    useEffect(() => {
        if (!ocId) return;

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            dispatch(saveRelegations({ ocId, data: relegationData }));
        }, 500);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [relegationData, ocId, dispatch]);

    const handleAddRelegation = () => {
        const newRelegation: Relegation = {
            id: Date.now().toString(),
            dateOfRelegation: "",
            courseRelegatedTo: "",
            reason: "",
            isRowEditing: true,
        };
        setRelegationData([...relegationData, newRelegation]);
    };

    const handleChange = (id: string, key: keyof Relegation, value: string) => {
        setRelegationData(prev =>
            prev.map(r => {
                if (r.id === id) {
                    return { ...r, [key]: value };
                }
                return r;
            }),
        );
    };

    const handleDeleteRelegation = (id: string) => {
        setRelegationData(prev => prev.filter(r => r.id !== id));
        toast.success("Relegation deleted");
    };

    const handleRowEdit = (id: string) => {
        setRelegationData(prev =>
            prev.map(r => {
                if (r.id === id) {
                    return { ...r, isRowEditing: true };
                }
                return r;
            }),
        );
    };

    const handleRowSave = (id: string) => {
        const rowToSave = relegationData.find(r => r.id === id);

        if (!rowToSave) return;

        if (
            !rowToSave.dateOfRelegation.trim() ||
            !rowToSave.courseRelegatedTo.trim() ||
            !rowToSave.reason.trim()
        ) {
            toast.error("Please fill in all fields before saving");
            return;
        }

        setRelegationData(prev =>
            prev.map(r => {
                if (r.id === id) {
                    return { ...r, isRowEditing: false };
                }
                return r;
            }),
        );
        toast.success("Row saved successfully");
    };

    const handleCancel = () => {
        setRelegationData(prev =>
            prev.map(r => ({
                ...r,
                isRowEditing: false,
            })),
        );
        setIsEditing(false);
    };

    const handleEdit = () => setIsEditing(true);

    const handleSave = () => {
        const hasEmptyRows = relegationData.some(
            row =>
                row.isRowEditing &&
                (!row.dateOfRelegation.trim() ||
                    !row.courseRelegatedTo.trim() ||
                    !row.reason.trim())
        );

        if (hasEmptyRows) {
            toast.error("Please fill in all fields before saving");
            return;
        }

        setIsEditing(false);
        toast.success("Relegation data saved successfully");
    };

    return (
        <div>
            <h2 className="p-2 text-lg font-bold text-left text-gray-700 underline">Relegations, If Any</h2>

            {isEditing && (
                <div className="text-xs text-gray-500 text-right mb-2">
                    ✓ Changes are saved automatically
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-gray-300 px-4 py-2 text-left">Date of Relegations</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Course Relegated to</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Reason</th>
                            {isEditing && <th className="border border-gray-300 px-4 py-2 text-center">Action</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {relegationData.length > 0 ? (
                            relegationData.map(relegation => {
                                const { id, dateOfRelegation, courseRelegatedTo, reason, isRowEditing } = relegation;
                                return (
                                    <tr key={id} className="hover:bg-gray-50 border-b border-gray-300">
                                        <td className="border border-gray-300 px-4 py-2">
                                            {isRowEditing ? (
                                                <Input
                                                    type="date"
                                                    value={dateOfRelegation}
                                                    onChange={(e) => handleChange(id, "dateOfRelegation", e.target.value)}
                                                    placeholder="Date of Relegation"
                                                    className="w-full"
                                                />
                                            ) : (
                                                <span>{dateOfRelegation || "-"}</span>
                                            )}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-2">
                                            {isRowEditing ? (
                                                <Input
                                                    type="text"
                                                    value={courseRelegatedTo}
                                                    onChange={(e) => handleChange(id, "courseRelegatedTo", e.target.value)}
                                                    placeholder="Enter course"
                                                    className="w-full"
                                                />
                                            ) : (
                                                <span>{courseRelegatedTo || "-"}</span>
                                            )}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-2">
                                            {isRowEditing ? (
                                                <Input
                                                    type="text"
                                                    value={reason}
                                                    onChange={(e) => handleChange(id, "reason", e.target.value)}
                                                    placeholder="Enter reason"
                                                    className="w-full"
                                                />
                                            ) : (
                                                <span>{reason || "-"}</span>
                                            )}
                                        </td>
                                        {isEditing && (
                                            <td className="border border-gray-300 px-4 py-2">
                                                <div className="flex gap-2 justify-center">
                                                    {isRowEditing ? (
                                                        <>
                                                            <Button
                                                                onClick={() => handleRowSave(id)}
                                                                className="bg-blue-600 hover:bg-blue-700"
                                                                size="sm"
                                                            >
                                                                Save
                                                            </Button>
                                                            <Button
                                                                onClick={handleCancel}
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                onClick={() => handleRowEdit(id)}
                                                                variant="outline"
                                                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                                                size="sm"
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleDeleteRelegation(id)}
                                                                variant="outline"
                                                                className="text-red-600 border-red-600 hover:bg-red-50"
                                                                size="sm"
                                                            >
                                                                Delete
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={isEditing ? 4 : 3} className="border border-gray-300 px-4 py-2 text-center text-gray-500">
                                    {isEditing ? "No relegations added. Click 'Add Relegation' to add new entries." : "No relegations"}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isEditing && (
                <div className="flex gap-3 justify-center mt-4">
                    <Button onClick={handleAddRelegation} className="bg-green-600 hover:bg-green-700">
                        + Add Relegation
                    </Button>
                </div>
            )}

            <div className="flex gap-3 justify-center mt-4">
                {isEditing ? (
                    <>
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>Save</Button>
                    </>
                ) : (
                    <Button onClick={handleEdit}>Edit</Button>
                )}
            </div>
        </div>
    );
}