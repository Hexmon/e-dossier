"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";

type AwardRow = {
    id: string;
    label: string;
    value: string;
};

export default function MotivationAwards({ activeSemester }: { activeSemester: string }) {
    const [isEditing, setIsEditing] = useState(false);
    const [awards, setAwards] = useState({
        meritCard: "",
        halfBlue: "",
        blue: "",
        blazer: ""
    });

    const handleChange = (field: keyof typeof awards, value: string) => {
        setAwards(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        setIsEditing(false);
        console.log("Motivation Awards saved:", awards);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const tableData: AwardRow[] = [
        { id: "meritCard", label: "Merit Card", value: awards.meritCard },
        { id: "halfBlue", label: "Half Blue", value: awards.halfBlue },
        { id: "blue", label: "Blue", value: awards.blue },
        { id: "blazer", label: "Blazer", value: awards.blazer }
    ];

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
                    onChange={(e) => handleChange(row.id as keyof typeof awards, e.target.value)}
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
                <UniversalTable<AwardRow>
                    data={tableData}
                    config={config}
                />
            </div>

            {/* Edit/Save/Cancel Buttons */}
            <div className="flex gap-3 justify-center mt-6">
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
