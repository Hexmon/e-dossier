"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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

    return (
        <div>
            <div>
                <h2 className="mt-4 text-left text-lg font-bold text-gray-700">Motivation Awards</h2>
            </div>
            <table className="w-full mt-4">
                <tbody>
                    <tr>
                        <td className="border border-gray-300 px-4 py-2 text-left">Merit Card</td>
                        <td>
                            <Textarea
                                value={awards.meritCard}
                                onChange={(e) => handleChange("meritCard", e.target.value)}
                                placeholder="Enter Motivation Award"
                                className="border border-gray-300 px-4 py-2"
                                disabled={!isEditing}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 px-4 py-2 text-left">Half Blue</td>
                        <td>
                            <Textarea
                                value={awards.halfBlue}
                                onChange={(e) => handleChange("halfBlue", e.target.value)}
                                placeholder="Enter Motivation Award"
                                className="border border-gray-300 px-4 py-2"
                                disabled={!isEditing}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 px-4 py-2 text-left">Blue</td>
                        <td>
                            <Textarea
                                value={awards.blue}
                                onChange={(e) => handleChange("blue", e.target.value)}
                                placeholder="Enter Motivation Award"
                                className="border border-gray-300 px-4 py-2"
                                disabled={!isEditing}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="border rounded border-gray-300 px-4 py-2 text-left">Blazer</td>
                        <td>
                            <Textarea
                                value={awards.blazer}
                                onChange={(e) => handleChange("blazer", e.target.value)}
                                placeholder="Enter Motivation Award"
                                className="border border-gray-300 px-4 py-2"
                                disabled={!isEditing}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>

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
