"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Withdrawal {
    id: string;
    dateWithdrawn: string;
    reason: string;
}

export default function Withdrawal() {
    const [isEditing, setIsEditing] = useState(false);
    const [withdrawalData, setWithdrawalData] = useState<Withdrawal[]>([]);

    const handleAddWithdrawal = () => {
        const newWithdrawal: Withdrawal = {
            id: Date.now().toString(),
            dateWithdrawn: "",
            reason: "",
        };
        setWithdrawalData([...withdrawalData, newWithdrawal]);
    };

    const handleChange = (id: string, key: keyof Withdrawal, value: string) => {
        setWithdrawalData(prev =>
            prev.map(w => {
                if (w.id === id) {
                    return { ...w, [key]: value };
                }
                return w;
            }),
        );
    };

    const handleDeleteWithdrawal = (id: string) => {
        setWithdrawalData(prev => prev.filter(w => w.id !== id));
    };

    const handleEdit = () => setIsEditing(true);
    const handleSave = () => {
        setIsEditing(false);
        console.log("Withdrawal Table saved:", withdrawalData);
    };
    const handleCancel = () => setIsEditing(false);

    return (
        <div>
            <h2 className="p-2 text-lg font-bold text-left text-gray-700 underline">Withdrawal</h2>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-gray-300 px-4 py-2 text-left">Date Withdrawn</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Reason</th>
                            {isEditing && <th className="border border-gray-300 px-4 py-2 text-center">Action</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {withdrawalData.length > 0 ? (
                            withdrawalData.map(withdrawal => {
                                const { id, dateWithdrawn, reason } = withdrawal;
                                return (
                                    <tr key={id} className="hover:bg-gray-50 border-b border-gray-300">
                                        <td className="border border-gray-300 px-4 py-2">
                                            {isEditing ? (
                                                <Input
                                                    type="date"
                                                    value={dateWithdrawn}
                                                    onChange={(e) => handleChange(id, "dateWithdrawn", e.target.value)}
                                                    placeholder="Date Withdrawn"
                                                    className="w-full"
                                                />
                                            ) : (
                                                <span>{dateWithdrawn || "-"}</span>
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
                                                    onClick={() => handleDeleteWithdrawal(id)}
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
                                <td colSpan={isEditing ? 3 : 2} className="border border-gray-300 px-4 py-2 text-center text-gray-500">
                                    {isEditing ? "No withdrawals added. Click 'Add Withdrawal' to add new entries." : "No withdrawals"}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Withdrawal Button - Only in Edit Mode */}
            {isEditing && (
                <div className="flex gap-3 justify-center mt-4">
                    <Button onClick={handleAddWithdrawal} className="bg-green-600 hover:bg-green-700">
                        + Add Withdrawal
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