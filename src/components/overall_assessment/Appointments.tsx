"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Appointment {
    id: string;
    appointments: string;
    from: string;
    to: string;
    remarks: string;
    isRowEditing?: boolean;
}

export default function Appointments() {
    const [isEditing, setIsEditing] = useState(false);
    const [appointmentData, setAppointmentData] = useState<Appointment[]>([]);

    const handleAddAppointment = () => {
        const newAppointment: Appointment = {
            id: Date.now().toString(),
            appointments: "",
            from: "",
            to: "",
            remarks: "",
            isRowEditing: false,
        };
        setAppointmentData([...appointmentData, newAppointment]);
    };

    const handleChange = (id: string, key: keyof Appointment, value: string) => {
        setAppointmentData(prev =>
            prev.map(a => {
                if (a.id === id) {
                    return { ...a, [key]: value };
                }
                return a;
            }),
        );
    };

    const handleDeleteAppointment = (id: string) => {
        setAppointmentData(prev => prev.filter(a => a.id !== id));
    };

    const handleRowEdit = (id: string) => {
        setAppointmentData(prev =>
            prev.map(a => {
                if (a.id === id) {
                    return { ...a, isRowEditing: true };
                }
                return a;
            }),
        );
    };

    const handleRowSave = (id: string) => {
        const rowToSave = appointmentData.find(a => a.id === id);

        if (!rowToSave) return;

        // Check if all fields are empty
        if (
            !rowToSave.appointments.trim() ||
            !rowToSave.from.trim() ||
            !rowToSave.to.trim() ||
            !rowToSave.remarks.trim()
        ) {
            toast.error("Please fill in all fields before saving");
            return;
        }

        setAppointmentData(prev =>
            prev.map(a => {
                if (a.id === id) {
                    return { ...a, isRowEditing: false };
                }
                return a;
            }),
        );
        toast.success("Row saved successfully");
        console.log("Row saved:", rowToSave);
    };

    const handleCancel = () => {
        setAppointmentData(prev =>
            prev.map(a => ({
                ...a,
                isRowEditing: false,
            })),
        );
        setIsEditing(false);
    };

    const handleEdit = () => setIsEditing(true);

    const handleSave = () => {
        // Check if there are any empty rows in edit mode
        const hasEmptyRows = appointmentData.some(
            row =>
                row.isRowEditing &&
                (!row.appointments.trim() ||
                    !row.from.trim() ||
                    !row.to.trim() ||
                    !row.remarks.trim())
        );

        if (hasEmptyRows) {
            toast.error("Please fill in all fields before saving");
            return;
        }

        setIsEditing(false);
        console.log("Appointments Table saved:", appointmentData);
        toast.success("Appointment data saved successfully");
    };

    return (
        <div>
            <h2 className="p-2 text-lg font-bold text-left text-gray-700 underline">Appointments Held, If Any</h2>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-gray-300 px-4 py-2 text-left">Appointments</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">From</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">To</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Remarks</th>
                            {isEditing && <th className="border border-gray-300 px-4 py-2 text-center">Action</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {appointmentData.length > 0 ? (
                            appointmentData.map(appointment => {
                                const { id, appointments, from, to, remarks, isRowEditing } = appointment;
                                return (
                                    <tr key={id} className="hover:bg-gray-50 border-b border-gray-300">
                                        <td className="border border-gray-300 px-4 py-2">
                                            {isRowEditing ? (
                                                <Input
                                                    type="text"
                                                    value={appointments}
                                                    onChange={(e) => handleChange(id, "appointments", e.target.value)}
                                                    placeholder="Enter appointment"
                                                    className="w-full"
                                                />
                                            ) : (
                                                <span>{appointments || "-"}</span>
                                            )}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-2">
                                            {isRowEditing ? (
                                                <Input
                                                    type="date"
                                                    value={from}
                                                    onChange={(e) => handleChange(id, "from", e.target.value)}
                                                    placeholder="From"
                                                    className="w-full"
                                                />
                                            ) : (
                                                <span>{from || "-"}</span>
                                            )}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-2">
                                            {isRowEditing ? (
                                                <Input
                                                    type="date"
                                                    value={to}
                                                    onChange={(e) => handleChange(id, "to", e.target.value)}
                                                    placeholder="To"
                                                    className="w-full"
                                                />
                                            ) : (
                                                <span>{to || "-"}</span>
                                            )}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-2">
                                            {isRowEditing ? (
                                                <Input
                                                    type="text"
                                                    value={remarks}
                                                    onChange={(e) => handleChange(id, "remarks", e.target.value)}
                                                    placeholder="Enter remarks"
                                                    className="w-full"
                                                />
                                            ) : (
                                                <span>{remarks || "-"}</span>
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
                                                                onClick={() => handleDeleteAppointment(id)}
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
                                <td colSpan={isEditing ? 5 : 4} className="border border-gray-300 px-4 py-2 text-center text-gray-500">
                                    {isEditing ? "No appointments added. Click 'Add Appointment' to add new entries." : "No appointments"}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Appointment Button - Only in Edit Mode */}
            {isEditing && (
                <div className="flex gap-3 justify-center mt-4">
                    <Button onClick={handleAddAppointment} className="bg-green-600 hover:bg-green-700">
                        + Add Appointment
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
        </div>
    );
}
