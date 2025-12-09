"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Appointment {
    id: string;
    appointments: string;
    from: string;
    to: string;
    remarks: string;
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

    const handleEdit = () => setIsEditing(true);
    const handleSave = () => {
        setIsEditing(false);
        console.log("Appointments Table saved:", appointmentData);
    };
    const handleCancel = () => setIsEditing(false);

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
                                const { id, appointments, from, to, remarks } = appointment;
                                return (
                                    <tr key={id} className="hover:bg-gray-50 border-b border-gray-300">
                                        <td className="border border-gray-300 px-4 py-2">
                                            {isEditing ? (
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
                                            {isEditing ? (
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
                                            {isEditing ? (
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
                                            {isEditing ? (
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
                                            <td className="border border-gray-300 px-4 py-2 text-center">
                                                <Button
                                                    onClick={() => handleDeleteAppointment(id)}
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