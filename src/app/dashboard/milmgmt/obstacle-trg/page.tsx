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
import { createObstacleTraining, listObstacleTraining, updateObstacleTraining, deleteObstacleTraining } from "@/app/lib/api/obstacleTrainingApi";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";


export default function ObstacleTrgPage() {
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const [editingId, setEditingId] = useState<string | null | undefined>(null);
    const [editForm, setEditForm] = useState<Row | null>(null);

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id?: string | null; index: number; row: Row } | null>(null);


    const [activeTab, setActiveTab] = useState<number>(0);
    const [savedData, setSavedData] = useState<TermData[]>(
        terms.map(() => ({ records: [] }))
    );
    const [isSaving, setIsSaving] = useState(false);

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
                    .filter((it: any) => Number(it.semester) === sem)
                    .map((it: any) => ({ id: it.id, obstacle: it.obstacle, obtained: String(it.marksObtained ?? ""), remark: it.remark ?? "" }));
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
            console.error("Failed to fetch obstacle training:", err);
            // Don't surface noisy errors on initial load, but log for debugging
        }
    };

    const onSubmit = async (formData: TermData) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        const ocId = selectedCadet.ocId;
        const semester = activeTab + 4; // terms are IV/V/VI

        const payloads = formData.records.slice(0, obstaclePrefill.length).map((r) => ({
            semester,
            obstacle: r.obstacle,
            marksObtained: Number(r.obtained) || 0,
            remark: r.remark || undefined,
        }));

        setIsSaving(true);

        try {
            for (const p of payloads) {
                await createObstacleTraining(ocId, p);
            }

            // Refresh from server to keep client and server in sync
            await fetchSaved(ocId);

            toast.success(`Data saved for ${terms[activeTab]}!`);
        } catch (err) {
            console.error("Failed to save obstacle training:", err);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCadet?.ocId, activeTab]);

    const handleDelete = (r: Row, i: number): void => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }
        
        setPendingDelete({ id: r.id, index: i, row: r });
        setDeleteDialogOpen(true);
    };

    const handleEditObstacle = (record: Row) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        setEditingId(record.id);
        setEditForm({ ...record });
    };
    

    const confirmDelete = async () => {
        if (!selectedCadet?.ocId || !pendingDelete) {
            setDeleteDialogOpen(false);
            setPendingDelete(null);
            return;
        }

        const { id, index } = pendingDelete;

        try {
            if (id) {
                await deleteObstacleTraining(selectedCadet.ocId, id);
            }
            setSavedData(prev => {
                const updated = [...prev];
                updated[activeTab].records = updated[activeTab].records.filter((_, idx) => idx !== index);
                return updated;
            });
            toast.success("Record deleted");
        } catch (err) {
            console.error("Failed to delete obstacle training:", err);
            toast.error("Failed to delete record");
        } finally {
            setDeleteDialogOpen(false);
            setPendingDelete(null);
        }
    };

    
    const handleCancelObstacleEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };
    const handleChangeObstacle = (field: keyof Row, value: any) => {
        setEditForm(prev => prev ? { ...prev, [field]: value } : prev);
    };

    const handleSaveObstacle = async () => {
        if (!selectedCadet?.ocId || !editingId || !editForm) {
            toast.error("Invalid operation");
            return;
        }

        try {
            await updateObstacleTraining(selectedCadet.ocId, editingId, {
                marksObtained: Number(editForm.obtained),
                remark: editForm.remark || undefined,
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
                                    {terms.map((term, idx) => (
                                        <button
                                            key={term}
                                            type="button"
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

                                {/* Saved Table */}
                                <div className="mb-6">
                                    {savedData[activeTab].records.length === 0 ? (
                                        <p className="text-center text-gray-500 border rounded-lg p-4">
                                            No data submitted yet for this term.
                                        </p>
                                    ) : (
                                        <table className="w-full border text-sm rounded-lg overflow-hidden">
                                            <thead className="bg-gray-200">
                                                <tr>
                                                    <th className="p-2 border">No</th>
                                                    <th className="p-2 border">Obstacle</th>
                                                    <th className="p-2 border">Obtained</th>
                                                    <th className="p-2 border">Remarks</th>
                                                    <th className="p-2 border">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {savedData[activeTab].records.map((r, i) => (
                                                    <tr key={r.id ?? i}>
                                                        <td className="p-2 border text-center">{i + 1}</td>
                                                        <td className="p-2 border">{r.obstacle}</td>
                                                        {editingId && r.id === editingId ? (
                                                            <>
                                                                <td className="p-2 border text-center">
                                                                    <Input
                                                                        value={editForm?.obtained ?? ''}
                                                                        onChange={(e) => handleChangeObstacle('obtained', e.target.value)}
                                                                        type="number"
                                                                    />
                                                                </td>
                                                                <td className="p-2 border text-center">
                                                                    <Input
                                                                        value={editForm?.remark ?? ''}
                                                                        onChange={(e) => handleChangeObstacle('remark', e.target.value)}
                                                                        type="text"
                                                                    />
                                                                </td>
                                                                <td className="p-2 border text-center space-x-2">
                                                                    <Button size="sm" className="bg-green-600 text-white" onClick={handleSaveObstacle} disabled={isSaving}>
                                                                        {isSaving ? 'Saving...' : 'Save'}
                                                                    </Button>
                                                                    <Button size="sm" variant="outline" onClick={handleCancelObstacleEdit} disabled={isSaving}>
                                                                        Cancel
                                                                    </Button>
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="p-2 border text-center">{r.obtained || "-"}</td>
                                                                <td className="p-2 border text-center">{r.remark || "-"}</td>
                                                                <td className="p-2 border text-center space-x-2">
                                                                    <Button size="sm" variant="ghost" onClick={() => handleEditObstacle(r)}>
                                                                        Edit
                                                                    </Button>
                                                                    <Button className='hover:bg-red-500 hover:text-white' size="sm" variant="destructive" onClick={() => handleDelete(r, i)}>
                                                                        Delete
                                                                    </Button>
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))}

                                                {/* Total Row */}
                                                <tr className="font-semibold bg-gray-50">
                                                    <td className="p-2 border text-center">{obstaclePrefill.length + 1}</td>
                                                    <td className="p-2 border">Total</td>
                                                    <td className="p-2 border text-center">
                                                        {totalMarks}
                                                    </td>
                                                    <td className="p-2 border text-center">—</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    )}
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
                                                {obstaclePrefill.map((row, i) => (
                                                    <tr key={i}>
                                                        <td className="p-2 border text-center">{i + 1}</td>
                                                        <td className="p-2 border">{row.obstacle}</td>
                                                        <td className="p-2 border">
                                                            <Input
                                                                {...register(`records.${i}.obtained`)}
                                                                type="number"
                                                                placeholder="Marks"
                                                            />
                                                        </td>
                                                        <td className="p-2 border">
                                                            <Input
                                                                {...register(`records.${i}.remark`)}
                                                                type="text"
                                                                placeholder="Remark"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}

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
                                        <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSaving}>
                                            {isSaving ? "Saving..." : "Save"}
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => reset({ records: obstaclePrefill })}>
                                            Reset
                                        </Button>
                                    </div>
                                </form>
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
                {/* Delete confirmation dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete obstacle record?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will remove the selected obstacle record. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setPendingDelete(null); }}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete}>
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main>
        </DashboardLayout >
    );
}