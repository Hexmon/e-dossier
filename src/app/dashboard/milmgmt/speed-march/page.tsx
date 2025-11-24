"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TermData, Row } from "@/types/speedMarchRunback";
import { tablePrefill, termColumns, terms } from "@/constants/app.constants";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Settings, Shield } from "lucide-react";
import { toast } from "sonner";
import { createSpeedMarch, listSpeedMarch, updateSpeedMarch } from "@/app/lib/api/speedMarchApi";

export default function SpeedMarchPage() {
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const [isSaving, setIsSaving] = useState(false);
    const [isEditingAll, setIsEditingAll] = useState(false);

    const [activeTab, setActiveTab] = useState<number>(0);
    const [savedData, setSavedData] = useState<TermData[]>(
        terms.map(() => ({ records: [] }))
    );

    const { register, handleSubmit, reset } = useForm<TermData>({
        defaultValues: { records: tablePrefill },
    });



    const fetchSaved = async (ocId?: string | null) => {
        if (!ocId) return;
        try {
            const res = await listSpeedMarch(ocId);
            const items = res.items || [];

            const newSaved = terms.map((_, idx) => {
                const sem = idx + 4;
                const rows = tablePrefill.map((pref, i) => {
                    const { test, timing30Label, distance10, distance20, distance30, marks, remark } = pref || {};
                    const found = (items as any[]).find((it) => Number(it.semester) === sem && it.test === test);
                    const id = found?.id || `${test}-${i}`;
                    return {
                        id: id,
                        test: test,
                        timing10Label: timing30Label,
                        distance10: sem === 4 ? (found?.timings ?? "") : distance10,
                        timing20Label: timing30Label,
                        distance20: sem === 5 ? (found?.timings ?? "") : distance20,
                        timing30Label: timing30Label,
                        distance30: sem === 6 ? (found?.timings ?? "") : distance30,
                        marks: String(found?.marks ?? marks),
                        remark: found?.remark ?? remark ?? "",
                    } as any;
                });
                return { records: rows } as TermData;
            });

            setSavedData(newSaved);
            const current = newSaved[activeTab];
            if (!current?.records?.length) return;

            reset({ records: tablePrefill });

        } catch (err) {
            toast.error("Failed to load speed march records");
        }
    };

    useEffect(() => {
        if (!selectedCadet?.ocId) return;
        fetchSaved(selectedCadet.ocId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCadet?.ocId, activeTab]);

    const onSubmit = async (formData: TermData) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }
        const ocId = selectedCadet.ocId;
        const semester = activeTab + 4;
        setIsSaving(true);
        try {
            const existing = savedData[activeTab]?.records || [];
            for (let i = 0; i < (formData.records || []).length; i++) {
                const r = formData.records[i] as any;
                const timingKey = termColumns[activeTab].distance; // measured value
                const timingsRaw = r[timingKey];
                const timings = timingsRaw !== undefined && timingsRaw !== null ? String(timingsRaw).trim() : "";
                const marks = Number(tablePrefill[i].marks);
                const remark = r.remark ? String(r.remark).trim() : undefined;

                const matched = existing.find((ex) => ex.test === tablePrefill[i].test && ex.id);
                if (matched && matched.id) {
                    const payload: any = {};
                    if (timings !== "") payload.timings = timings;
                    if (!Number.isNaN(marks)) payload.marks = marks;
                    if (remark) payload.remark = remark;

                    if (Object.keys(payload).length > 0) {
                        await updateSpeedMarch(ocId, matched.id, payload);
                    }
                } else {
                    if (timings === "") continue;
                    await createSpeedMarch(ocId, { semester, test: tablePrefill[i].test, timings, marks, remark });
                }
            }

            await fetchSaved(ocId);
            setIsEditingAll(false);
            toast.success("Speed march saved");
        } catch (err) {
            toast.error("Failed to save speed march. Try again.");
        } finally {
            setIsSaving(false);
        }
    };



    const handleTabChange = (idx: number) => {
        setActiveTab(idx);
        // Always reset the editable form to the default prefill when switching tabs
        reset({ records: tablePrefill });
    };

    return (
        <DashboardLayout
            title="Assessment: Speed March / Run Back"
            description="Timing standards and marks for Speed March and Run Back."
        >
            <main className="p-6">

                {/* Breadcrumb */}
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Speed March-Run Back" },
                    ]}
                />

                {/* Sticky cadet table */}
                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="speed-march"
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <TabsTrigger value="dossier-insp" className="flex items-center gap-2" >
                                    <Shield className="h-4 w-4" />
                                    Mil-Trg
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </TabsTrigger>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {militaryTrainingCards.map((card) => {
                                    const { to } = card;
                                    if (!to) return null;
                                    return (
                                        <DropdownMenuItem key={to} asChild>
                                            <a href={to} className="flex items-center gap-2">
                                                <card.icon className={`h-4 w-4 ${card.color}`} />
                                                <span>{card.title}</span>
                                            </a>
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                >
                    <TabsContent value="speed-march">
                        <Card className="max-w-7xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center text-primary">
                                    SPEED MARCH / RUN BACK
                                </CardTitle>
                            </CardHeader>

                            <CardContent>

                                {/* Tabs */}
                                <div className="flex justify-center mb-6 space-x-2">
                                    {terms.map((term, idx) => (
                                        <button
                                            key={term}
                                            onClick={() => handleTabChange(idx)}
                                            className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-200 text-gray-700"
                                                }`}
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>

                                {/* Saved table */}
                                {savedData[activeTab].records.length > 0 && (
                                    <div className="mb-6 overflow-x-auto border rounded-lg shadow">
                                        <table className="w-full border text-sm rounded-lg overflow-hidden">
                                            <thead className="bg-gray-200">
                                                <tr>
                                                    <th className="p-2 border">Test</th>
                                                    <th className="p-2 border">Timings</th>
                                                    <th className="p-2 border">
                                                        {activeTab === 0 ? "10 KM" : activeTab === 1 ? "20 KM" : "30 KM"}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {savedData[activeTab].records.map((r, i) => {
                                                    const { id, test } = r;
                                                    const timingKey = termColumns[activeTab].timing as keyof Row;
                                                    const distanceKey = termColumns[activeTab].distance as keyof Row;
                                                    return (
                                                        <tr key={id || `${test}-${i}`}>
                                                            <td className="p-2 border">{test}</td>
                                                            <td className="p-2 border text-center">
                                                                {isEditingAll ? (
                                                                    <Input
                                                                        value={(r as any)[timingKey] ?? ""}
                                                                        onChange={(e) => {
                                                                            const v = e.target.value;
                                                                            setSavedData(prev => {
                                                                                const copy = prev.map(t => ({ records: t.records.map(rr => ({ ...rr })) }));
                                                                                if (!copy[activeTab]) return prev;
                                                                                copy[activeTab].records[i] = { ...copy[activeTab].records[i], [timingKey]: v } as Row;
                                                                                return copy;
                                                                            });
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <span>{r[termColumns[activeTab].timing]}</span>
                                                                )}
                                                            </td>
                                                            <td className="p-2 border text-center">
                                                                {isEditingAll ? (
                                                                    <Input
                                                                        value={(r as any)[distanceKey] ?? ""}
                                                                        onChange={(e) => {
                                                                            const v = e.target.value;
                                                                            setSavedData(prev => {
                                                                                const copy = prev.map(t => ({ records: t.records.map(rr => ({ ...rr })) }));
                                                                                if (!copy[activeTab]) return prev;
                                                                                copy[activeTab].records[i] = { ...copy[activeTab].records[i], [distanceKey]: v } as Row;
                                                                                return copy;
                                                                            });
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <span>{r[termColumns[activeTab].distance]}</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        {/* Edit whole table button placed outside saved table (rendered below) */}
                                    </div>
                                )}

                                {/* Bulk edit controls (outside saved table) */}
                                <div className="mb-4 flex justify-end gap-2">
                                    {!isEditingAll ? (
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                if (savedData[activeTab]?.records?.length) {
                                                    setIsEditingAll(true);
                                                }
                                            }}
                                        >
                                            Edit Table
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                type="button"
                                                className="bg-green-600 hover:bg-green-700"
                                                onClick={async () => {
                                                    if (!selectedCadet?.ocId) {
                                                        toast.error("No cadet selected");
                                                        return;
                                                    }
                                                    setIsSaving(true);
                                                    try {
                                                        const ocId = selectedCadet.ocId;
                                                        const semester = activeTab + 4;
                                                        const rows = savedData[activeTab]?.records || [];
                                                        for (let i = 0; i < rows.length; i++) {
                                                            const rec = rows[i] as any;
                                                            const timingKey = termColumns[activeTab].distance;
                                                            const timingsRaw = rec[timingKey];
                                                            const timings = timingsRaw !== undefined && timingsRaw !== null ? String(timingsRaw).trim() : "";
                                                            const marks = Number(rec.marks);
                                                            const remark = rec.remark ? String(rec.remark).trim() : undefined;

                                                            if (rec.id) {
                                                                const payload: any = {};
                                                                if (timings !== "") payload.timings = timings;
                                                                if (!Number.isNaN(marks)) payload.marks = marks;
                                                                if (remark) payload.remark = remark;
                                                                if (Object.keys(payload).length > 0) {
                                                                    await updateSpeedMarch(ocId, rec.id, payload);
                                                                }
                                                            } else {
                                                                if (timings === "") continue;
                                                                await createSpeedMarch(ocId, { semester, test: rec.test, timings, marks, remark });
                                                            }
                                                        }

                                                        await fetchSaved(selectedCadet.ocId);
                                                        setIsEditingAll(false);
                                                        toast.success("Saved table changes");
                                                    } catch (err) {
                                                        toast.error("Failed to save changes. Try again.");
                                                    } finally {
                                                        setIsSaving(false);
                                                    }
                                                }}
                                                disabled={isSaving}
                                            >
                                                Save Changes
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={async () => {
                                                    if (!selectedCadet?.ocId) return;
                                                    await fetchSaved(selectedCadet.ocId);
                                                    setIsEditingAll(false);
                                                }}
                                            >
                                                Cancel Edit
                                            </Button>
                                        </>
                                    )}
                                </div>

                                {/* (bulk edit operates directly on savedData; no separate edit copy) */}

                                {/* Editable Form */}
                                <form onSubmit={handleSubmit(onSubmit)}>
                                    <div className="overflow-x-auto border rounded-lg shadow">
                                        <table className="w-full border text-sm">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="p-2 border">Test</th>
                                                    <th className="p-2 border">Timings</th>
                                                    <th className="p-2 border">
                                                        {activeTab === 0 ? "10 KM" : activeTab === 1 ? "20 KM" : "30 KM"}
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {(tablePrefill || []).map((row, i) => {
                                                    const { id, test } = row;

                                                    return (
                                                        <tr key={id || `${test}-${i}`}>
                                                            <td className="p-2 border">{test}</td>

                                                            <td className="p-2 border">
                                                                <Input
                                                                    {...register(`records.${i}.${termColumns[activeTab].timing}`)}
                                                                    defaultValue={row[termColumns[activeTab].timing]}
                                                                    disabled={isEditingAll}
                                                                />
                                                            </td>

                                                            <td className="p-2 border">
                                                                <Input
                                                                    {...register(`records.${i}.${termColumns[activeTab].distance}`)}
                                                                    defaultValue={row[termColumns[activeTab].distance]}
                                                                    disabled={isEditingAll}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>

                                        </table>
                                    </div>

                                    <div className="flex justify-center gap-3 mt-6">
                                        <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSaving || isEditingAll}>
                                            Save
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => reset({ records: tablePrefill })}
                                            disabled={isEditingAll}
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
        </DashboardLayout >
    );
}
