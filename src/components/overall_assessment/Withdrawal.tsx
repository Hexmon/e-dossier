"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { RootState } from "@/store";
import { saveWithdrawals } from "@/store/slices/overallAssessmentSlice";

interface Withdrawal {
    id: string;
    dateWithdrawn: string;
    reason: string;
    isRowEditing?: boolean;
}

interface WithdrawalProps {
    ocId: string;
}

export default function Withdrawal({ ocId }: WithdrawalProps) {
    const dispatch = useDispatch();
    const [isEditing, setIsEditing] = useState(false);

    // Get saved data from Redux
    const savedData = useSelector((state: RootState) =>
        state.overallAssessment.forms[ocId]?.withdrawals
    );

    const [withdrawalData, setWithdrawalData] = useState<Withdrawal[]>(() =>
        savedData || []
    );

    // Debounce ref
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Load saved data when ocId changes
    useEffect(() => {
        if (savedData) {
            setWithdrawalData(savedData);
        }
    }, [ocId, savedData]);

    // Auto-save with debounce
    useEffect(() => {
        if (!ocId) return;

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            dispatch(saveWithdrawals({ ocId, data: withdrawalData }));
        }, 500);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [withdrawalData, ocId, dispatch]);

    const handleAddWithdrawal = () => {
        const newWithdrawal: Withdrawal = {
            id: Date.now().toString(),
            dateWithdrawn: "",
            reason: "",
            isRowEditing: true,
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
        toast.success("Withdrawal deleted");
    };

    const handleRowEdit = (id: string) => {
        setWithdrawalData(prev =>
            prev.map(w => {
                if (w.id === id) {
                    return { ...w, isRowEditing: true };
                }
                return w;
            }),
        );
    };

    const handleRowSave = (id: string) => {
        const rowToSave = withdrawalData.find(w => w.id === id);

        if (!rowToSave) return;

        if (!rowToSave.dateWithdrawn.trim() || !rowToSave.reason.trim()) {
            toast.error("Please fill in all fields before saving");
            return;
        }

        setWithdrawalData(prev =>
            prev.map(w => {
                if (w.id === id) {
                    return { ...w, isRowEditing: false };
                }
                return w;
            }),
        );
        toast.success("Row saved successfully");
    };

    const handleCancel = () => {
        setWithdrawalData(prev =>
            prev.map(w => ({
                ...w,
                isRowEditing: false,
            })),
        );
        setIsEditing(false);
    };

    const handleEdit = () => setIsEditing(true);

    const handleSave = () => {
        const hasEmptyRows = withdrawalData.some(
            row => row.isRowEditing && (!row.dateWithdrawn.trim() || !row.reason.trim())
        );

        if (hasEmptyRows) {
            toast.error("Please fill in all fields before saving");
            return;
        }

        setIsEditing(false);
        toast.success("Withdrawal data saved successfully");
    };

    return (
        <div>
            <h2 className="p-2 text-lg font-bold text-left text-foreground underline">Withdrawal</h2>

            {isEditing && (
                <div className="text-xs text-muted-foreground text-right mb-2">
                    ✓ Changes are saved automatically
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-muted/70">
                        <tr>
                            <th className="border border-border px-4 py-2 text-left">Date Withdrawn</th>
                            <th className="border border-border px-4 py-2 text-left">Reason</th>
                            {isEditing && <th className="border border-border px-4 py-2 text-center">Action</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {withdrawalData.length > 0 ? (
                            withdrawalData.map(withdrawal => {
                                const { id, dateWithdrawn, reason, isRowEditing } = withdrawal;
                                return (
                                    <tr key={id} className="hover:bg-muted/40 border-b border-border">
                                        <td className="border border-border px-4 py-2">
                                            {isRowEditing ? (
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
                                        <td className="border border-border px-4 py-2">
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
                                            <td className="border border-border px-4 py-2">
                                                <div className="flex gap-2 justify-center">
                                                    {isRowEditing ? (
                                                        <>
                                                            <Button
                                                                onClick={() => handleRowSave(id)}
                                                                className="bg-primary hover:bg-primary/90"
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
                                                                className="border-primary text-primary hover:bg-primary/10"
                                                                size="sm"
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleDeleteWithdrawal(id)}
                                                                variant="outline"
                                                                className="text-destructive border-destructive hover:bg-destructive/10"
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
                                <td colSpan={isEditing ? 3 : 2} className="border border-border px-4 py-2 text-center text-muted-foreground">
                                    {isEditing ? "No withdrawals added. Click 'Add Withdrawal' to add new entries." : "No withdrawals"}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isEditing && (
                <div className="flex gap-3 justify-center mt-4">
                    <Button onClick={handleAddWithdrawal} className="bg-success hover:bg-success/90">
                        + Add Withdrawal
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