"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Row, TermData } from "@/types/obstacleTrg";
import { obstaclePrefill, terms } from "@/constants/app.constants";
import { TabsContent } from "@radix-ui/react-tabs";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Settings, Shield } from "lucide-react";
import { TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { createObstacleTraining, listObstacleTraining, updateObstacleTraining } from "@/app/lib/api/obstacleTrainingApi";



export default function ObstacleTrgPage() {
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const [editingId, setEditingId] = useState<string | null | undefined>(null);
    const [editForm, setEditForm] = useState<Row | null>(null);


    const [activeTab, setActiveTab] = useState<number>(0);
    const [savedData, setSavedData] = useState<TermData[]>(
        terms.map(() => ({ records: [] }))
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isEditingAll, setIsEditingAll] = useState(false);

    const { register, handleSubmit, reset, control } = useForm<TermData>({
        defaultValues: { records: obstaclePrefill },
    });

    const watchedRecords = useWatch({ control, name: "records" });
    const totalMarks = watchedRecords?.reduce(
        (sum, r) => sum + (parseFloat(r.obtained) || 0),
        0
    );




    const fetchSaved = async (ocId?: string | null) => {
        if (!ocId) return;
        try {
            const res = await listObstacleTraining(ocId);
            const items = res.items || [];

            const newSaved = terms.map((_, idx) => {
                const sem = idx + 4; // IV -> 4, V -> 5, VI -> 6
                const rows = items
                    .filter((it) => Number(it.semester) === sem)
                    .map((it) => {
                        const { id, obstacle, marksObtained, remark } = it;
                        return {
                            id: id,
                            obstacle: obstacle,
                            obtained: String(marksObtained ?? ""),
                            remark: remark ?? "",
                        };
                    });
                return { records: rows } as TermData;
            });

            setSavedData(newSaved);
            // If current term has data, reset form to it, else prefill
            const current = newSaved[activeTab];
            if (current && current.records.length) {
                reset({ records: current.records });
            } else {
                reset({ records: obstaclePrefill });
            }
        } catch (err) {
            toast.error("Failed to load obstacle training records");
        }
    };

    const onSubmit = async (formData: TermData) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        const ocId = selectedCadet.ocId;
        const semester = activeTab + 4; // terms are IV/V/VI

        const payloads = formData.records.slice(0, obstaclePrefill.length).map((r) => {
            const { id, obstacle, obtained, remark } = r;
            return {
                id: id,
                semester: semester,
                obstacle: obstacle,
                marksObtained: Number(obtained) || 0,
                remark: remark || undefined,
            };
        });

        setIsSaving(true);

        try {
            for (const p of payloads) {
                await createObstacleTraining(ocId, p);
            }

            // Refresh from server to keep client and server in sync
            await fetchSaved(ocId);
            setIsEditingAll(false);

            toast.success(`Data saved for ${terms[activeTab]}!`);
        } catch (err) {
            toast.error("Failed to save obstacle training. Try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleTabChange = (index: number) => {
        setActiveTab(index);

        const term = savedData[index];
        if (term.records.length) {
            reset({
                records: term.records,
            });
        } else {
            reset({ records: obstaclePrefill });
        }
    };

    useEffect(() => {
        // Fetch saved rows when cadet or activeTab changes
        if (!selectedCadet?.ocId) return;
        fetchSaved(selectedCadet.ocId);
    }, [selectedCadet?.ocId, activeTab]);

    const handleEditObstacle = (record: Row) => {
        const { id } = record;
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        setEditingId(id);
        setEditForm({ ...record });
    };


    const handleCancelObstacleEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };
    const handleChangeObstacle = (field: keyof Row, value: any) => {
        setEditForm(prev => prev ? { ...prev, [field]: value } : prev);
    };

    const handleSaveObstacle = async () => {
        const { obtained, remark } = editForm || {};
        if (!selectedCadet?.ocId || !editingId || !editForm || !obtained || !remark) {
            toast.error("Invalid operation");
            return;
        }

        try {
            await updateObstacleTraining(selectedCadet.ocId, editingId, {
                marksObtained: Number(obtained),
                remark: remark,
            });

            setSavedData(prev => {
                const updated = [...prev];
                const idx = updated[activeTab].records.findIndex(r => r.id === editingId);
                if (idx >= 0) updated[activeTab].records[idx] = editForm;
                return updated;
            });

            toast.success("Record updated");
            setEditingId(null);
            setEditForm(null);
        } catch (err) {
            toast.error("Failed to update record");
        }
    };



    return (
        <DashboardLayout
            title="Assessment: Obstacle Training"
            description="Record of obstacle training performance and remarks."
        >
            <main className="p-6">
                {/* Breadcrumb */}
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: "/dashboard/milmgmt" },
                        { label: "Obstacle Training" },
                    ]}
                />

                {/* Selected Cadet */}
                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}
                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="obstacle-trg"
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
                                    const { to,color,title } = card;
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
                    <TabsContent value="obstacle-trg">
                        <Card className="max-w-5xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center text-primary">
                                    OBSTACLE TRAINING
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                {/* Term Tabs */}
                                <div className="flex justify-center mb-6 space-x-2">
                                    {terms.map((term, idx) => {
                                        return (
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
                                        );
                                    })}
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit(onSubmit)}>
                                    <div className="overflow-x-auto border rounded-lg shadow">
                                        <table className="w-full border text-sm">
                                            <thead className="bg-gray-100 text-left">
                                                <tr>
                                                    <th className="p-2 border">No</th>
                                                    <th className="p-2 border">Obstacle</th>
                                                    <th className="p-2 border">Marks Obtained</th>
                                                    <th className="p-2 border">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {obstaclePrefill.map((row, i) => {
                                                    const { id, obstacle } = row;
                                                    return (
                                                        <tr key={id || `${obstacle}-${i}`}>
                                                            <td className="p-2 border text-center">{i + 1}</td>
                                                            <td className="p-2 border">{obstacle}</td>
                                                            <td className="p-2 border">
                                                                <Input
                                                                    {...register(`records.${i}.obtained`)}
                                                                    type="number"
                                                                    placeholder="Marks"
                                                                    disabled={!isEditingAll}
                                                                />
                                                            </td>
                                                            <td className="p-2 border">
                                                                <Input
                                                                    {...register(`records.${i}.remark`)}
                                                                    type="text"
                                                                    placeholder="Remark"
                                                                    disabled={!isEditingAll}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {/* Total row */}
                                                <tr className="font-semibold bg-gray-50">
                                                    <td className="p-2 border text-center">{obstaclePrefill.length + 1}</td>
                                                    <td className="p-2 border">Total</td>
                                                    <td className="p-2 border text-center">{totalMarks}</td>
                                                    <td className="p-2 border text-center">—</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex justify-center gap-3 mt-6">
                                        {isEditingAll ? (
                                            <>
                                                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSaving}>
                                                    {isSaving ? "Saving..." : "Save"}
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={async () => {
                                                        // revert form to server state and exit edit mode
                                                        if (!selectedCadet?.ocId) return;
                                                        await fetchSaved(selectedCadet.ocId);
                                                        setIsEditingAll(false);
                                                    }}
                                                    disabled={isSaving}
                                                >
                                                    Cancel Edit
                                                </Button>

                                                <Button type="button" variant="outline" onClick={() => reset({ records: obstaclePrefill })} disabled={isSaving}>
                                                    Reset
                                                </Button>
                                            </>
                                        ) : null}
                                    </div>
                                </form>

                                {/* Edit Table button is intentionally outside the form to avoid accidental submits */}
                                <div className="flex justify-center mb-4">
                                    {!isEditingAll && (
                                        <Button
                                            type="button"
                                            onClick={() => setIsEditingAll(true)}
                                            disabled={isSaving}
                                        >
                                            Edit Table
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="mil-trg">
                        <div className="text-center py-12">
                            <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-xl font-semibold">Military Training Section</h3>
                        </div>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout >
    );
}