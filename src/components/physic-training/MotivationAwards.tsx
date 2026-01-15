"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UniversalTable, TableColumn, TableConfig } from "@/components/layout/TableLayout";
import { toast } from "sonner";

import type { RootState } from "@/store";
import { saveMotivationAwards } from "@/store/slices/physicalTrainingSlice";

type AwardRow = {
    id: string;
    label: string;
    value: string;
};

interface MotivationAwardsProps {
    activeSemester: string;
    ocId: string;
}

const DEFAULT_AWARDS = {
    meritCard: "",
    halfBlue: "",
    blue: "",
    blazer: ""
};

export default function MotivationAwards({ activeSemester, ocId }: MotivationAwardsProps) {
    const dispatch = useDispatch();
    const [isEditing, setIsEditing] = useState(false);

    // Get saved data from Redux
    const savedData = useSelector((state: RootState) =>
        state.physicalTraining.forms[ocId]?.[activeSemester]?.motivationAwards
    );

    const [awards, setAwards] = useState(savedData || DEFAULT_AWARDS);

    // Load saved data when semester changes
    useEffect(() => {
        if (savedData) {
            setAwards(savedData);
        }
    }, [savedData, activeSemester]);

    // Auto-save to Redux whenever data changes
    useEffect(() => {
        if (awards && ocId) {
            dispatch(saveMotivationAwards({
                ocId,
                semester: activeSemester,
                data: awards
            }));
        }
    }, [awards, ocId, activeSemester, dispatch]);

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
        toast.success("Motivation Awards saved successfully");
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

            {/* Auto-save indicator */}
            <p className="text-sm text-muted-foreground text-center mt-2">
                * Changes are automatically saved
            </p>
        </div>
    );
}