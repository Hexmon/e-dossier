"use client";

import { Button } from "@/components/ui/button";
import { Edit3, Trash2, Eye } from "lucide-react";
import type { OCRecord } from "@/app/lib/api/ocApi";
import { toDisplayDMY } from "@/app/lib/dateUtils";

type OCRow = OCRecord & {
    courseCode?: string;
    courseTitle?: string;
    platoonName?: string | null;
    platoonKey?: string | null;
};

type Props = {
    ocList: OCRow[];
    onView: (id: string) => void;
    onEdit: (index: number) => void;
    onDelete: (id: string) => void;
};

export default function OCsTable({ ocList, onView, onEdit, onDelete }: Props) {
    return (
        <div className="rounded-md border border-border/50 overflow-hidden">
            <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                    <tr className="text-left">
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">TES No</th>
                        <th className="px-3 py-2">Course</th>
                        <th className="px-3 py-2">Platoon</th>
                        <th className="px-3 py-2">Arrival</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 w-56">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {ocList.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                                No OCs found
                            </td>
                        </tr>
                    ) : (
                        ocList.map((oc, index) => {
                            const courseLabel = oc.courseCode ?? oc.courseTitle ?? oc.courseId;
                            const platoonLabel = oc.platoonName ?? oc.platoonKey ?? oc.platoonId ?? "";
                            const status = oc.withdrawnOn ? "inactive" : "active";
                            return (
                                <tr key={oc.id ?? index} className="border-t border-border/50">
                                    <td className="px-3 py-2">{oc.name}</td>
                                    <td className="px-3 py-2">{oc.ocNo}</td>
                                    <td className="px-3 py-2">{courseLabel}</td>
                                    <td className="px-3 py-2">{platoonLabel}</td>
                                    <td className="px-3 py-2">{toDisplayDMY(oc.arrivalAtUniversity)}</td>
                                    <td className="px-3 py-2">
                                        {status === "inactive" ? (
                                            <span className="text-destructive">inactive</span>
                                        ) : (
                                            <span className="text-emerald-600">active</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-2">
                                            {oc.id && (
                                                <Button variant="outline" size="sm" onClick={() => onView(oc.id!)}>
                                                    <Eye className="h-3 w-3 mr-1" /> View
                                                </Button>
                                            )}
                                            <Button variant="outline" size="sm" onClick={() => onEdit(index)}>
                                                <Edit3 className="h-3 w-3 mr-1" /> Edit
                                            </Button>
                                            {oc.id && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onDelete(oc.id!)}
                                                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                                >
                                                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}
