"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { Shield, ChevronDown } from "lucide-react";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { DetentionFormData, DetentionFormRow, DetentionRow } from "@/types/detention";
import { semesters } from "@/constants/app.constants";

const defaultFormRow: DetentionFormRow = {
    reason: "",
    fromDate: "",
    toDate: "",
    remarks: "",
};

export default function DetentionPageLocal() {
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const [activeTab, setActiveTab] = useState<number>(0);
    const [savedData, setSavedData] = useState<DetentionRow[][]>(semesters.map(() => []));
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editingValues, setEditingValues] = useState<Partial<DetentionRow> | null>(null);

    const { control, handleSubmit, register, reset } = useForm<DetentionFormData>({
        defaultValues: { records: [{ ...defaultFormRow }] },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "records",
    });

    useEffect(() => {
        const saved = localStorage.getItem("detention_local_v1");
        if (saved) {
            try {
                const parsed: DetentionRow[][] = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length === semesters.length) {
                    setSavedData(parsed);
                }
            } catch {
            }
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem("detention_local_v1", JSON.stringify(savedData));
        } catch {
        }
    }, [savedData]);

    const onSubmit = (data: DetentionFormData) => {
        const payload: DetentionRow[] = data.records.map((r) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            serialNo: "",
            term: semesters[activeTab],
            reason: r.reason,
            fromDate: r.fromDate,
            toDate: r.toDate,
            remarks: r.remarks,
        }));

        setSavedData((prev) => {
            const next = [...prev];
            next[activeTab] = [...next[activeTab], ...payload];
            next[activeTab] = next[activeTab].map((row, i) => ({ ...row, serialNo: String(i + 1) }));
            return next;
        });

        reset({ records: [{ ...defaultFormRow }] });
        replace([{ ...defaultFormRow }]);
        setEditingRowId(null);
        setEditingValues(null);
    };

    const handleDelete = (index: number) => {
        setSavedData((prev) => {
            const next = [...prev];
            next[activeTab] = next[activeTab].filter((_, i) => i !== index);
            next[activeTab] = next[activeTab].map((r, i) => ({ ...r, serialNo: String(i + 1) }));
            return next;
        });
        setEditingRowId(null);
        setEditingValues(null);
    };

    const beginEdit = (row: DetentionRow) => {
        setEditingRowId(row.id);
        setEditingValues({ ...row });
    };

    const cancelEdit = () => {
        setEditingRowId(null);
        setEditingValues(null);
    };

    const saveEdit = (rowIndex: number) => {
        if (!editingValues) return;
        setSavedData((prev) => {
            const next = [...prev];
            const updated: DetentionRow = {
                ...next[activeTab][rowIndex],
                reason: editingValues.reason ?? "",
                fromDate: editingValues.fromDate ?? "",
                toDate: editingValues.toDate ?? "",
                remarks: editingValues.remarks ?? "",
            };
            next[activeTab][rowIndex] = updated;
            return next;
        });
        cancelEdit();
    };

    const setEditingField = (field: keyof DetentionRow, value: any) => {
        setEditingValues((prev) => ({ ...(prev ?? {}), [field]: value }));
    };

    return (
        <DashboardLayout
            title="Record Of Detention During Term Break/ Mid Term Break"
            description="Record of Detention During Term Break / Mid Term Break (local demo)."
        >
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Detention Record" },
                    ]}
                />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="detention"
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <TabsTrigger value="mil-trg" className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Mil-Trg
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </TabsTrigger>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {militaryTrainingCards.map((card) => (
                                    <DropdownMenuItem key={card.to} asChild>
                                        <a href={card.to} className="flex items-center gap-2">
                                            <card.icon className={`h-4 w-4 ${card.color}`} />
                                            <span>{card.title}</span>
                                        </a>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                >
                    <TabsContent value="detention">
                        <section className="p-6">
                            <Card className="max-w-6xl mx-auto p-6 shadow bg-white">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold text-center">
                                        Record Of Detention During Term Break/ Mid Term Break
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    {/* Term Tabs */}
                                    <div className="flex justify-center mb-6 space-x-2">
                                        {semesters.map((term, idx) => (
                                            <button
                                                key={term}
                                                onClick={() => {
                                                    setActiveTab(idx);
                                                    cancelEdit();
                                                }}
                                                className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-200 text-gray-700"
                                                    }`}
                                            >
                                                {term}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Saved Records Table (View) */}
                                    <div className="overflow-x-auto border rounded-lg shadow mb-6">
                                        {savedData[activeTab].length === 0 ? (
                                            <p className="text-center p-4 text-gray-500">No saved records for this term.</p>
                                        ) : (
                                            <table className="w-full border text-sm">
                                                <thead className="bg-gray-100">
                                                    <tr>
                                                        <th className="p-2 border text-center">S No</th>
                                                        <th className="p-2 border">Reason</th>
                                                        <th className="p-2 border">From</th>
                                                        <th className="p-2 border">To</th>
                                                        <th className="p-2 border">Remarks</th>
                                                        <th className="p-2 border text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {savedData[activeTab].map((row, i) => {
                                                        const isEditing = editingRowId === row.id;
                                                        return (
                                                            <tr key={row.id}>
                                                                <td className="p-2 border text-center">
                                                                    <Input value={String(i + 1)} disabled className="bg-gray-100 text-center" />
                                                                </td>

                                                                {/* Reason */}
                                                                <td className="p-2 border">
                                                                    {isEditing ? (
                                                                        <Input
                                                                            value={editingValues?.reason ?? ""}
                                                                            onChange={(e) => setEditingField("reason", (e.target as HTMLInputElement).value)}
                                                                        />
                                                                    ) : (
                                                                        <div>{row.reason}</div>
                                                                    )}
                                                                </td>

                                                                {/* From */}
                                                                <td className="p-2 border">
                                                                    {isEditing ? (
                                                                        <Input
                                                                            type="date"
                                                                            value={editingValues?.fromDate ?? ""}
                                                                            onChange={(e) => setEditingField("fromDate", (e.target as HTMLInputElement).value)}
                                                                        />
                                                                    ) : (
                                                                        <div>{row.fromDate}</div>
                                                                    )}
                                                                </td>

                                                                {/* To */}
                                                                <td className="p-2 border">
                                                                    {isEditing ? (
                                                                        <Input
                                                                            type="date"
                                                                            value={editingValues?.toDate ?? ""}
                                                                            onChange={(e) => setEditingField("toDate", (e.target as HTMLInputElement).value)}
                                                                        />
                                                                    ) : (
                                                                        <div>{row.toDate}</div>
                                                                    )}
                                                                </td>

                                                                {/* Remarks */}
                                                                <td className="p-2 border">
                                                                    {isEditing ? (
                                                                        <Input
                                                                            value={editingValues?.remarks ?? ""}
                                                                            onChange={(e) => setEditingField("remarks", (e.target as HTMLInputElement).value)}
                                                                        />
                                                                    ) : (
                                                                        <div>{row.remarks}</div>
                                                                    )}
                                                                </td>

                                                                {/* Action */}
                                                                <td className="p-2 border text-center">
                                                                    {isEditing ? (
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <Button size="sm" onClick={() => saveEdit(i)}>Save</Button>
                                                                            <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <Button size="sm" onClick={() => beginEdit(row)}>Edit</Button>
                                                                            <Button size="sm" variant="destructive" onClick={() => handleDelete(i)}>Delete</Button>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>

                                    {/* Form Table for adding new rows */}
                                    <form onSubmit={handleSubmit(onSubmit)}>
                                        <div className="overflow-x-auto border rounded-lg shadow">
                                            <table className="w-full border text-sm">
                                                <thead className="bg-gray-100">
                                                    <tr>
                                                        <th className="p-2 border text-center">S No</th>
                                                        <th className="p-2 border">Reason</th>
                                                        <th className="p-2 border">From</th>
                                                        <th className="p-2 border">To</th>
                                                        <th className="p-2 border">Remarks</th>
                                                        <th className="p-2 border text-center">Action</th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {fields.map((field, idx) => (
                                                        <tr key={field.id}>
                                                            <td className="p-2 border text-center">
                                                                <Input value={String(idx + 1)} disabled className="bg-gray-100 text-center" />
                                                            </td>

                                                            <td className="p-2 border">
                                                                <Input {...register(`records.${idx}.reason`)} />
                                                            </td>

                                                            <td className="p-2 border">
                                                                <Input type="date" {...register(`records.${idx}.fromDate`)} />
                                                            </td>

                                                            <td className="p-2 border">
                                                                <Input type="date" {...register(`records.${idx}.toDate`)} />
                                                            </td>

                                                            <td className="p-2 border">
                                                                <Input {...register(`records.${idx}.remarks`)} />
                                                            </td>

                                                            <td className="p-2 border text-center">
                                                                <Button type="button" size="sm" variant="destructive" onClick={() => remove(idx)}>Remove</Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="mt-4 flex justify-center gap-4">
                                            <Button type="button" onClick={() => append({ ...defaultFormRow })}>+ Add Row</Button>
                                            <Button type="submit" className="bg-green-600 hover:bg-green-700">Submit</Button>
                                            <Button type="button" variant="outline" onClick={() => replace([{ ...defaultFormRow }])}>Reset</Button>
                                        </div>
                                    </form>

                                </CardContent>
                            </Card>
                        </section>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
