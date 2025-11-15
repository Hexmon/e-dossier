"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Shield, ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { PageHeader } from "@/components/layout/PageHeader";
import DossierTab from "@/components/Tabs/DossierTab";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteParentComm, getParentComms, saveParentComms, updateParentComm } from "@/app/lib/api/parentComnApi";
import { toast } from "sonner";
import { ParentCommForm, ParentCommRow } from "@/types/comn-partents";

// ─────────────── COMPONENT ───────────────

export default function ParentCommnPage() {
    const router = useRouter();
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);
    const handleLogout = () => router.push("/login");

    const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<ParentCommRow | null>(null);

    const defaultRow = {
        serialNo: "",
        letterNo: "",
        date: "",
        teleCorres: "",
        briefContents: "",
        sigPICdr: "",
    };

    const { control, handleSubmit, register, reset } = useForm<ParentCommForm>({
        defaultValues: {
            records: [{ ...defaultRow }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "records",
    });

    const [savedData, setSavedData] = useState<ParentCommRow[][]>(
        semesters.map(() => [])
    );

    const handleEdit = (row: ParentCommRow) => {
        if (!row.id) return toast.error("Record missing ID");
        setEditingId(row.id);
        setEditForm({ ...row });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const handleSave = async () => {
        if (!selectedCadet?.ocId || !editingId || !editForm) return;

        const payload = {
            refNo: editForm.letterNo,
            date: editForm.date,
            subject: editForm.teleCorres,
            brief: editForm.briefContents,
            platoonCommanderName: editForm.sigPICdr,
        };

        try {
            await updateParentComm(selectedCadet.ocId, editingId, payload);

            setSavedData(prev => {
                const updated = [...prev];
                updated[activeTab] = updated[activeTab].map(r =>
                    r.id === editingId ? { ...editForm } : r
                );
                return updated;
            });

            toast.success("Record updated!");
            handleCancel();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update record");
        }
    };

    const handleDelete = async (row: ParentCommRow) => {
        if (!selectedCadet?.ocId || !row.id) return;

        if (!toast.warning("Delete this record?")) return;

        try {
            await deleteParentComm(selectedCadet.ocId, row.id);

            setSavedData(prev => {
                const updated = [...prev];
                updated[activeTab] = updated[activeTab].filter(r => r.id !== row.id);
                return updated;
            });

            toast.success("Record deleted");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete record");
        }
    };


    const onSubmit = async (data: ParentCommForm) => {
        if (!selectedCadet?.ocId) {
            toast.error("Please select a cadet first.");
            return;
        }

        const newEntries = data.records.map((row, i) => ({
            serialNo: String(savedData[activeTab].length + i + 1),
            letterNo: row.letterNo,
            date: row.date,
            teleCorres: row.teleCorres,
            briefContents: row.briefContents,
            sigPICdr: row.sigPICdr,
        }));

        const payloads = data.records.map((row) => ({
            semester: activeTab + 1,
            mode: "LETTER",
            refNo: row.letterNo,
            date: row.date,
            subject: row.teleCorres || "Parent Communication",
            brief: row.briefContents,
            platoonCommanderName: row.sigPICdr || null,
        }));

        setLoading(true);
        try {
            const responses = await saveParentComms(selectedCadet.ocId, payloads);
            if (responses.length > 0) {
                toast.success("Records saved successfully!");
                const updated = [...savedData];
                updated[activeTab] = [...updated[activeTab], ...newEntries];
                setSavedData(updated);
                reset({ records: [{ ...defaultRow }] });
            } else {
                toast.error("Failed to save records. Check console for details.");
            }
        } catch (err) {
            toast.error("Error while saving records.");
        } finally {
            setLoading(false);
        }
    };

    const fetchComms = async () => {
        if (!selectedCadet?.ocId) return;
        setLoading(true);
        setError(null);

        try {
            const records = await getParentComms(selectedCadet.ocId);
            console.log("Fetched Parent Comms:", records);

            // Group by semester 1–6
            const grouped = semesters.map(() => [] as ParentCommRow[]);
            for (const rec of records) {
                const semIndex = rec.semester - 1;
                if (semIndex >= 0 && semIndex < semesters.length) {
                    grouped[semIndex].push({
                        id: rec.id,
                        serialNo: String(grouped[semIndex].length + 1),
                        letterNo: rec.refNo || "-",
                        date: rec.date?.split("T")[0] || "-",
                        teleCorres: rec.subject || "-",
                        briefContents: rec.brief || "-",
                        sigPICdr: rec.platoonCommanderName || "-",
                    });
                }
            }
            setSavedData(grouped);
        } catch (err) {
            console.error(err);
            setError("Failed to load parent communications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComms();
    }, [selectedCadet]);

    // ─────────────── RENDER ───────────────

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                    <PageHeader
                        title="Record of Communication with Parents/Guardian"
                        description="Maintain communication details with parents or guardians."
                    />

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Dossier", href: "/dashboard/milmgmt" },
                                { label: "Parent Communication" },
                            ]}
                        />

                        {selectedCadet && (
                            <div className="hidden md:flex sticky top-16 z-40">
                                <SelectedCadetTable selectedCadet={selectedCadet} />
                            </div>
                        )}

                        {/* Dossier Tabs */}
                        <DossierTab
                            tabs={dossierTabs}
                            defaultValue="comn-parents"
                            extraTabs={
                                <div className="flex items-center justify-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <TabsTrigger
                                                value="dossier-insp"
                                                className="flex items-center gap-2 border border-transparent hover:!border-blue-700"
                                            >
                                                <Shield className="h-4 w-4" />
                                                Mil-Trg
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            </TabsTrigger>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                                            {militaryTrainingCards.map((card) => (
                                                <DropdownMenuItem key={card.to} asChild>
                                                    <a href={card.to} className="flex items-center gap-2 w-full">
                                                        <card.icon className={`h-4 w-4 ${card.color}`} />
                                                        <span>{card.title}</span>
                                                    </a>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            }
                        >
                            <TabsContent value="comn-parents" className="space-y-6">
                                <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow-xl bg-white">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-semibold text-center text-primary">
                                            RECORD OF COMMUNICATION WITH PARENTS / GUARDIAN
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent>
                                        {/* Semester Tabs */}
                                        <div className="flex justify-center mb-6 space-x-2">
                                            {semesters.map((sem, index) => (
                                                <button
                                                    key={sem}
                                                    type="button"
                                                    onClick={() => setActiveTab(index)}
                                                    className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === index
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-gray-200 text-gray-700"
                                                        }`}
                                                >
                                                    {sem}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Saved Data */}
                                        <div className="overflow-x-auto border rounded-lg shadow mb-6">
                                            {savedData[activeTab].length === 0 ? (
                                                <p className="text-center p-4 text-gray-500">
                                                    No data submitted yet for this semester.
                                                </p>
                                            ) : (
                                                <table className="w-full border text-sm">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            {Object.keys(defaultRow).map((key) => (
                                                                <th key={key} className="p-2 border capitalize">
                                                                    {key.replace(/([A-Z])/g, " $1")}
                                                                </th>
                                                            ))}
                                                            <th className="p-2 border text-center">Action</th>   {/* FIXED */}
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {savedData[activeTab].map((row, index) => {
                                                            const isEditing = editingId === row.id;

                                                            return (
                                                                <tr key={row.id || index}>

                                                                    {/* SERIAL NO — THIS WAS MISSING */}
                                                                    <td className="p-2 border">{row.serialNo}</td>

                                                                    {/* Letter No */}
                                                                    <td className="p-2 border">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                value={editForm?.letterNo || ""}
                                                                                onChange={(e) =>
                                                                                    setEditForm(prev => prev ? { ...prev, letterNo: e.target.value } : prev)
                                                                                }
                                                                            />
                                                                        ) : row.letterNo}
                                                                    </td>

                                                                    {/* Date */}
                                                                    <td className="p-2 border">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                type="date"
                                                                                value={editForm?.date || ""}
                                                                                onChange={(e) =>
                                                                                    setEditForm(prev => prev ? { ...prev, date: e.target.value } : prev)
                                                                                }
                                                                            />
                                                                        ) : row.date}
                                                                    </td>

                                                                    {/* Tele/Corres */}
                                                                    <td className="p-2 border">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                value={editForm?.teleCorres || ""}
                                                                                onChange={(e) =>
                                                                                    setEditForm(prev => prev ? { ...prev, teleCorres: e.target.value } : prev)
                                                                                }
                                                                            />
                                                                        ) : row.teleCorres}
                                                                    </td>

                                                                    {/* Brief */}
                                                                    <td className="p-2 border">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                value={editForm?.briefContents || ""}
                                                                                onChange={(e) =>
                                                                                    setEditForm(prev => prev ? { ...prev, briefContents: e.target.value } : prev)
                                                                                }
                                                                            />
                                                                        ) : row.briefContents}
                                                                    </td>

                                                                    {/* Sig PI Cdr */}
                                                                    <td className="p-2 border">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                value={editForm?.sigPICdr || ""}
                                                                                onChange={(e) =>
                                                                                    setEditForm(prev => prev ? { ...prev, sigPICdr: e.target.value } : prev)
                                                                                }
                                                                            />
                                                                        ) : row.sigPICdr}
                                                                    </td>

                                                                    {/* ACTION BUTTONS */}
                                                                    <td className="p-2 border text-center">
                                                                        {!isEditing ? (
                                                                            <>
                                                                                <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
                                                                                    Edit
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="destructive"
                                                                                    onClick={() => handleDelete(row)}
                                                                                >
                                                                                    Delete
                                                                                </Button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Button size="sm" onClick={handleSave}>Save</Button>
                                                                                <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
                                                                            </>
                                                                        )}
                                                                    </td>

                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>

                                        {/* Input Form */}
                                        <form onSubmit={handleSubmit(onSubmit)}>
                                            <div className="overflow-x-auto border rounded-lg shadow">
                                                <table className="w-full border text-sm">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            {Object.keys(defaultRow).map((key) => (
                                                                <th key={key} className="p-2 border capitalize">
                                                                    {key.replace(/([A-Z])/g, " $1")}
                                                                </th>
                                                            ))}
                                                            <th className="p-2 border text-center">Action</th>
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {fields.map((field, index) => (
                                                            <tr key={field.id}>
                                                                {Object.keys(defaultRow).map((key) => (
                                                                    <td key={key} className="p-2 border">
                                                                        <Input
                                                                            {...register(`records.${index}.${key}` as const)}
                                                                            type={key === "date" ? "date" : "text"}
                                                                        />
                                                                    </td>
                                                                ))}
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

                                            {/* Actions */}
                                            <div className="mt-4 flex justify-center gap-3">
                                                <Button type="button" onClick={() => append({ ...defaultRow })}>
                                                    + Add Row
                                                </Button>
                                                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                                                    Submit
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
                </div>
            </div>
        </SidebarProvider>
    );
}
