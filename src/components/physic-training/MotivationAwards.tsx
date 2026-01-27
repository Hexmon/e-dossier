"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
import { toast } from "sonner";
import { usePhysicalTrainingMotivationAwards } from "@/hooks/usePhysicalTrainingMotivationAwards";

type AwardRow = {
    id: string;
    fieldId: string;
    label: string;
    value: string;
};

interface MotivationAwardsProps {
    activeSemester: string;
    ocId: string;
}

export default function MotivationAwards({ activeSemester, ocId }: MotivationAwardsProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [localValues, setLocalValues] = useState<Record<string, string>>({});

    // Use the physical training motivation awards hook
    const { values, loading, error, fetchValues, saveValues, updateValues } = usePhysicalTrainingMotivationAwards(ocId);

    // Convert semester string to number (e.g., "I TERM" -> 1)
    const semesterMap: Record<string, number> = {
        'I TERM': 1,
        'II TERM': 2,
        'III TERM': 3,
        'IV TERM': 4,
        'V TERM': 5,
        'VI TERM': 6,
    };
    const semesterNumber = semesterMap[activeSemester] || 1;

    // Fetch values when component mounts or semester changes
    useEffect(() => {
        if (ocId && activeSemester) {
            fetchValues(semesterNumber);
        }
    }, [ocId, activeSemester, semesterNumber, fetchValues]);

    // Update local state when API values change
    useEffect(() => {
        const valueMap: Record<string, string> = {};
        values.forEach((item) => {
            valueMap[item.fieldId] = item.value || "";
        });
        setLocalValues(valueMap);
    }, [values]);

    const handleChange = (fieldId: string, value: string) => {
        setLocalValues(prev => ({
            ...prev,
            [fieldId]: value
        }));
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            const valuesToSave = Object.entries(localValues)
                .filter(([_, value]) => value.trim() !== "")
                .map(([fieldId, value]) => ({
                    fieldId,
                    value: value || null
                }));

            if (valuesToSave.length > 0) {
                await saveValues(semesterNumber, valuesToSave);
            } else {
                // If no values to save, just update with empty values to clear existing ones
                await updateValues(semesterNumber, [], values.map(v => v.fieldId));
            }

            setIsEditing(false);
            toast.success("Motivation Awards saved successfully");
        } catch (err) {
            console.error("Error saving motivation awards:", err);
            toast.error("Failed to save motivation awards");
        }
    };

    const handleCancel = () => {
        // Reset local values to current API values
        const valueMap: Record<string, string> = {};
        values.forEach((item) => {
            valueMap[item.fieldId] = item.value || "";
        });
        setLocalValues(valueMap);
        setIsEditing(false);
    };

    if (error) {
        return (
            <div className="p-4 text-red-600">
                Error loading motivation awards: {error}
            </div>
        );
    }

    const tableData: AwardRow[] = values.map((item) => ({
        id: item.id,
        fieldId: item.fieldId,
        label: item.fieldLabel,
        value: localValues[item.fieldId] || ""
    }));

    const columns: TableColumn<AwardRow>[] = [
        {
            key: "label",
            label: "Award Type",
            width: "30%",
            render: (value) => value
        },
        {
            key: "value",
            label: "Details",
            render: (value, row) => (
                <Textarea
                    value={value}
                    onChange={(e) => handleChange(row.fieldId, e.target.value)}
                    placeholder="Enter Motivation Award"
                    className="border border-gray-300 px-4 py-2"
                    disabled={!isEditing}
                />
            )
        }
    ];

    const config: TableConfig<AwardRow> = {
        columns,
        features: {
            sorting: false,
            filtering: false,
            pagination: false,
            selection: false,
            search: false
        },
        styling: {
            compact: false,
            bordered: true,
            striped: false,
            hover: false
        }
    };

    return (
        <div>
            <div>
                <h2 className="mt-4 text-left text-lg font-bold text-gray-700">Motivation Awards</h2>
            </div>

            <div className="mt-4">
                {loading ? (
                    <div className="text-center py-4">Loading...</div>
                ) : (
                    <UniversalTable<AwardRow>
                        data={tableData}
                        config={config}
                    />
                )}
            </div>

            {/* Edit/Save/Cancel Buttons */}
            <div className="flex gap-3 justify-center mt-6">
                {isEditing ? (
                    <>
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading ? "Saving..." : "Save"}
                        </Button>
                    </>
                ) : (
                    <Button onClick={handleEdit}>Edit</Button>
                )}
            </div>
        </div>
    );
}
