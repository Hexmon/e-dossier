"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DossierTab from "@/components/Tabs/DossierTab";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { ChevronDown, Shield } from "lucide-react";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { catOptions, semestersCfe } from "@/constants/app.constants";
import { cfeFormData, cfeRow, defaultRow } from "@/types/cfe";
import { createCreditForExcellence, getCreditForExcellence, listCreditForExcellence, updateCreditForExcellence, CfeItem, CfeRecord } from "@/app/lib/api/cfeApi";

export default function CFEFormPage() {
    const [activeTab, setActiveTab] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
    const [editingSemester, setEditingSemester] = useState<number | null>(null);

    const [savedData, setSavedData] = useState<cfeRow[][]>(semestersCfe.map(() => []));
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const { control, handleSubmit, register, reset, setValue, watch } = useForm<cfeFormData>({
        defaultValues: {
            records: [{ ...defaultRow }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "records",
    });

    const fetchCfeData = async (ocId: string) => {
    setIsLoading(true);
    try {
        const res = await listCreditForExcellence(ocId);
        const newSavedData = semestersCfe.map(() => [] as cfeRow[]);

        if (res.items) {
            res.items.forEach((record: CfeRecord) => {
                const semesterIdx = record.semester - 1;
                if (semesterIdx >= 0 && semesterIdx < semestersCfe.length) {
                    const { id, data, remark } = record;
                    const rows = (data || []).map((item: CfeItem, idx: number) => {
                        const { cat, marks, remarks } = item;
                        return {
                            id,
                            serialNo: String(idx + 1),
                            cat,
                            mks: String(marks),
                            remarks: remarks || remark || "",
                        };
                    });

                    newSavedData[semesterIdx] = [...newSavedData[semesterIdx], ...rows];
                }
            });
        }
        setSavedData(newSavedData);
    } catch (error) {
        toast.error("Failed to load data");
    } finally {
        setIsLoading(false);
    }
};

    useEffect(() => {
        if (selectedCadet?.ocId) {
            fetchCfeData(selectedCadet.ocId);
        } else {
            setSavedData(semestersCfe.map(() => []));
        }
    }, [selectedCadet?.ocId]);


    const onSubmit = async (data: cfeFormData) => {
    if (!selectedCadet?.ocId) {
        toast.error("No cadet selected");
        return;
    }

    const newItems: CfeItem[] = data.records
        .filter(r => r.cat && r.mks)
        .map(r => {
            const { cat, mks, remarks } = r;
            return {
                cat,
                marks: Number(mks) || 0,
                remarks,
            };
        });

    if (newItems.length === 0) {
        toast.error("Please fill at least one valid row");
        return;
    }

    try {
        if (editingId && editingRowIdx !== null && editingSemester !== null) {
            const currentSaved = savedData[editingSemester] || [];

            const allItems: CfeItem[] = currentSaved.map((r) => {
                const { cat, mks, remarks } = r;
                return {
                    cat,
                    marks: Number(mks) || 0,
                    remarks,
                };
            });

            const localIdx = editingRowIdx; 
            allItems.splice(localIdx, 1, ...newItems);

            await updateCreditForExcellence(selectedCadet.ocId, editingId, {
                semester: editingSemester + 1,
                data: allItems,
                remark: "",
            });
            toast.success("Updated successfully");
        } else {
            const existingRows = savedData[activeTab] || [];
            const existingItems: CfeItem[] = existingRows.map((r) => {
                const { cat, mks, remarks } = r;
                return {
                    cat,
                    marks: Number(mks) || 0,
                    remarks,
                };
            });

            const mergedItems = [...existingItems, ...newItems];

            const payload = {
                semester: activeTab + 1,
                data: mergedItems,
                remark: "",
            };
            await createCreditForExcellence(selectedCadet.ocId, [payload]);
            toast.success("Saved successfully");
        }

        // Refresh and clear
        await fetchCfeData(selectedCadet.ocId);
        reset({ records: [{ ...defaultRow }] });
        setEditingId(null);
        setEditingRowIdx(null);
        setEditingSemester(null);
    } catch (error) {
        toast.error("Failed to save data");
    }
};

    const handleEditSavedRow = (index: number) => {
        const rows = savedData[activeTab] || [];
        const rowToEdit = rows[index];
        if (!rowToEdit) return;

        const recordId = (rowToEdit as any).id;
        setEditingId(recordId || null);
        setEditingRowIdx(index);
        setEditingSemester(activeTab);

        
        setValue("records", [{
            serialNo: "1",
            cat: rowToEdit.cat,
            mks: rowToEdit.mks,
            remarks: rowToEdit.remarks
        }]);
    };

    const handleCancelEdit = () => {
        reset({ records: [{ ...defaultRow }] });
        setEditingId(null);
        setEditingRowIdx(null);
        setEditingSemester(null);
    };

    return (
        <DashboardLayout
            title="Credit For Excellence (CFE)"
            description="Manage and record cadet’s CFE scores and evaluation details."
        >
            <main className="flex-1 p-6">

                {/* Breadcrumb */}
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Credit For Excellence" },
                    ]}
                />

                {/* Selected Cadet */}
                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                {/* Dossier Tabs */}
                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="credit-excellence"
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <TabsTrigger
                                    value="miltrg"
                                    className="flex items-center gap-2"
                                >
                                    <Shield className="h-4 w-4" />
                                    Mil-Trg
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </TabsTrigger>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent>
                                {militaryTrainingCards.map((card) => {
                                    const { to, color, title } = card;
                                    if (!to) return null;
                                    return (
                                        <DropdownMenuItem key={to} asChild>
                                            <a href={to} className="flex items-center gap-2">
                                                <card.icon className={`h-4 w-4 ${color}`} />
                                                <span>{title}</span>
                                            </a>
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                >
                    <TabsContent value="credit-excellence">
                        <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center">
                                    CREDIT FOR EXCELLENCE (CFE)
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                {/* Semester tabs */}
                                <div className="flex justify-center mb-6 space-x-2">
                                    {semestersCfe.map((s, idx) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setActiveTab(idx)}
                                            className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>

                                <div className="overflow-x-auto border rounded-lg shadow mb-6">
                                    {savedData[activeTab].length === 0 ? (
                                        <p className="text-center p-4 text-gray-500">
                                            No submitted rows for this semester.
                                        </p>
                                    ) : (
                                        <table className="w-full border text-sm">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="p-2 border">S No</th>
                                                    <th className="p-2 border">Cat</th>
                                                    <th className="p-2 border">Mks</th>
                                                    <th className="p-2 border">Remarks</th>
                                                    <th className="p-2 border text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {savedData[activeTab].map((row, idx) => {
                                                    const isEditing = editingSemester === activeTab && editingRowIdx === idx;
                                                    return (
                                                        <tr key={`${activeTab}-${idx}`}>
                                                            <td className="p-2 border text-center">
                                                                {isEditing ? (
                                                                    <Input
                                                                        value={String(idx + 1)}
                                                                        disabled
                                                                        className="text-center bg-gray-100 cursor-not-allowed h-8"
                                                                    />
                                                                ) : (
                                                                    row.serialNo
                                                                )}
                                                            </td>
                                                            <td className="p-2 border">
                                                                {isEditing ? (
                                                                    <Select
                                                                        onValueChange={(value) =>
                                                                            setValue(`records.0.cat`, value, {
                                                                                shouldDirty: true,
                                                                                shouldValidate: true,
                                                                            })
                                                                        }
                                                                        defaultValue={row.cat}
                                                                    >
                                                                        <SelectTrigger className="w-full h-8">
                                                                            <SelectValue placeholder="Select category..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="max-h-72">
                                                                            {catOptions.map((opt, i) => (
                                                                                <SelectItem
                                                                                    key={i}
                                                                                    value={opt}
                                                                                    className="whitespace-normal"
                                                                                >
                                                                                    {opt}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                ) : (
                                                                    row.cat
                                                                )}
                                                            </td>
                                                            <td className="p-2 border text-center">
                                                                {isEditing ? (
                                                                    <Input
                                                                        {...register(`records.0.mks` as const)}
                                                                        type="text"
                                                                        className="h-8"
                                                                    />
                                                                ) : (
                                                                    row.mks
                                                                )}
                                                            </td>
                                                            <td className="p-2 border">
                                                                {isEditing ? (
                                                                    <Input
                                                                        {...register(`records.0.remarks` as const)}
                                                                        type="text"
                                                                        className="h-8"
                                                                    />
                                                                ) : (
                                                                    row.remarks
                                                                )}
                                                            </td>
                                                            <td className="p-2 border text-center">
                                                                {isEditing ? (
                                                                    <div className="flex gap-2 justify-center">
                                                                        <Button
                                                                            size="sm"
                                                                            className="bg-green-600 hover:bg-green-700"
                                                                            onClick={handleSubmit(onSubmit)}
                                                                        >
                                                                            Save
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={handleCancelEdit}
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleEditSavedRow(idx)}
                                                                        disabled={editingRowIdx !== null}
                                                                    >
                                                                        Edit
                                                                    </Button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Input form (dynamic rows) */}
                                <form onSubmit={handleSubmit(onSubmit)}>
                                    <div className="overflow-x-auto border rounded-lg shadow">
                                        <table className="w-full border text-sm">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="p-2 border">S No</th>
                                                    <th className="p-2 border">Cat</th>
                                                    <th className="p-2 border">Mks</th>
                                                    <th className="p-2 border">Remarks</th>
                                                    <th className="p-2 border text-center">Action</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {fields.map((field, index) => (
                                                    <tr key={field.id}>
                                                        {/* Serial auto-generated and disabled */}
                                                        <td className="p-2 border text-center">
                                                            <Input value={String(index + 1)} disabled className="text-center bg-gray-100 cursor-not-allowed" />
                                                        </td>


                                                        {/* Cat dropdown */}
                                                        <td className="p-2 border">
                                                            <Select
                                                                onValueChange={(value) =>
                                                                    setValue(`records.${index}.cat`, value, {
                                                                        shouldDirty: true,
                                                                        shouldValidate: true,
                                                                    })
                                                                }
                                                                defaultValue={watch(`records.${index}.cat`)}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select category..." />
                                                                </SelectTrigger>

                                                                <SelectContent className="max-h-72">
                                                                    {catOptions.map((opt, i) => (
                                                                        <SelectItem key={i} value={opt} className="whitespace-normal">
                                                                            {opt}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </td>

                                                        {/* Mks */}
                                                        <td className="p-2 border">
                                                            <Input {...register(`records.${index}.mks` as const)} type="text" />
                                                        </td>

                                                        {/* Remarks */}
                                                        <td className="p-2 border">
                                                            <Input {...register(`records.${index}.remarks` as const)} type="text" />
                                                        </td>

                                                        <td className="p-2 border text-center">
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => remove(index)}
                                                            >
                                                                Remove
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Row controls */}
                                    <div className="mt-4 flex justify-center gap-3">
                                        <Button type="button" onClick={() => append({ ...defaultRow })}>
                                            + Add Row
                                        </Button>

                                        <Button type="submit" className="bg-green-600 hover:bg-green-700">
                                            {editingId ? "Update" : "Submit"}
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => reset({ records: [{ ...defaultRow }] })}
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
