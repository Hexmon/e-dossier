"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { RootState } from "@/store";
import { saveAppointments } from "@/store/slices/overallAssessmentSlice";

interface Appointment {
    id: string;
    appointments: string;
    from: string;
    to: string;
    remarks: string;
    isRowEditing?: boolean;
}

interface AppointmentsProps {
    ocId: string;
}

export default function Appointments({ ocId }: AppointmentsProps) {
    const dispatch = useDispatch();
    const [isEditing, setIsEditing] = useState(false);

    // Get saved data from Redux
    const savedData = useSelector((state: RootState) =>
        state.overallAssessment.forms[ocId]?.appointments
    );

    const [appointmentData, setAppointmentData] = useState<Appointment[]>(() =>
        savedData || []
    );

    // Debounce ref
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Load saved data when ocId changes
    useEffect(() => {
        if (savedData) {
            setAppointmentData(savedData);
        }
    }, [ocId, savedData]);

    // Auto-save with debounce
    useEffect(() => {
        if (!ocId) return;

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            dispatch(saveAppointments({ ocId, data: appointmentData }));
        }, 500);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [appointmentData, ocId, dispatch]);

    const handleAddAppointment = () => {
        const newAppointment: Appointment = {
            id: Date.now().toString(),
            appointments: "",
            from: "",
            to: "",
            remarks: "",
            isRowEditing: true,
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
        toast.success("Appointment deleted");
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
        toast.success("Appointment data saved successfully");
    };

    return (
        <div>
            <h2 className="p-2 text-lg font-bold text-left text-gray-700 underline">Appointments Held, If Any</h2>

            {isEditing && (
                <div className="text-xs text-gray-500 text-right mb-2">
                    ✓ Changes are saved automatically
                </div>
            )}

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

            {isEditing && (
                <div className="flex gap-3 justify-center mt-4">
                    <Button onClick={handleAddAppointment} className="bg-green-600 hover:bg-green-700">
                        + Add Appointment
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