"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Relegation {
    id: string;
    dateOfRelegation: string;
    courseRelegatedTo: string;
    reason: string;
}

export default function Relegations() {
    const [isEditing, setIsEditing] = useState(false);
    const [relegationData, setRelegationData] = useState<Relegation[]>([]);

    const handleAddRelegation = () => {
        const newRelegation: Relegation = {
            id: Date.now().toString(),
            dateOfRelegation: "",
            courseRelegatedTo: "",
            reason: "",
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
    };

    const handleEdit = () => setIsEditing(true);
    const handleSave = () => {
        setIsEditing(false);
        console.log("Relegations Table saved:", relegationData);
    };
    const handleCancel = () => setIsEditing(false);

    return (
        <div>
            <h2 className="p-2 text-lg font-bold text-left text-gray-700 underline">Relegations, If Any</h2>
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
                                const { id, dateOfRelegation, courseRelegatedTo, reason } = relegation;
                                return (
                                    <tr key={id} className="hover:bg-gray-50 border-b border-gray-300">
                                        <td className="border border-gray-300 px-4 py-2">
                                            {isEditing ? (
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
                                            {isEditing ? (
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
                                            {isEditing ? (
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
                                            <td className="border border-gray-300 px-4 py-2 text-center">
                                                <Button
                                                    onClick={() => handleDeleteRelegation(id)}
                                                    variant="outline"
                                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                                >
                                                    Delete
                                                </Button>
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

            {/* Add Relegation Button - Only in Edit Mode */}
            {isEditing && (
                <div className="flex gap-3 justify-center mt-4">
                    <Button onClick={handleAddRelegation} className="bg-green-600 hover:bg-green-700">
                        + Add Relegation
                    </Button>
                </div>
            )}

            {/* Edit Buttons */}
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
        </div >
    );
}