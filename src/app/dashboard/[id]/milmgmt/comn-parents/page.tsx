"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ParentCommForm, { ParentCommFormData } from "@/components/parent/ParentCommForm";
import { useParentComms, ParentCommPayload, ParentCommRow } from "@/hooks/useParentComms";
import { useOcPersonal } from "@/hooks/useOcPersonal";
import ParentCommTable from "@/components/parent/ParentCommTable";
import { useOcDetails } from "@/hooks/useOcDetails";
import Link from "next/link";

export default function ParentCommnPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    const { cadet } = useOcDetails(ocId);

    const {
        name = "",
        courseName = "",
        ocNumber = "",
        ocId: cadetOcId = ocId,
        course = "",
    } = cadet ?? {};

    const selectedCadet = useMemo(() => ({ name, courseName, ocNumber, ocId: cadetOcId, course }), [name, courseName, ocNumber, cadetOcId, course]);

    const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];
    const [activeTab, setActiveTab] = useState<number>(0);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<ParentCommRow | null>(null);

    const { grouped, loading, fetch, save, update, remove } = useParentComms(ocId, semesters.length);

    useEffect(() => {
        if (!ocId) return;
        fetch();
    }, [ocId, fetch]);

    // handle create (from form)
    const handleSubmit = async (data: ParentCommFormData) => {
        if (!ocId) {
            toast.error("No OC selected");
            return;
        }

        const payloads: ParentCommPayload[] = data.records.map((r) => ({
            semester: activeTab + 1,
            mode: "LETTER",
            refNo: r.letterNo ?? "",
            date: r.date ?? "",
            subject: r.teleCorres ?? "",
            brief: r.briefContents ?? "",
            platoonCommanderName: r.sigPICdr ?? "",
        }));

        await save(activeTab + 1, payloads);
    };

    // delete
    const handleDelete = async (row: ParentCommRow) => {
        if (!row.id) return;
        const resp = await remove(row.id);
        if (!resp) return;
    };

    // edit flow
    const startEdit = (row: ParentCommRow) => {
        if (!row.id) return toast.error("Record missing id");
        setEditingId(row.id);
        setEditForm({ ...row });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const saveEdit = async () => {
        if (!ocId || !editingId || !editForm) return;
        const payload: Partial<ParentCommPayload> = {
            refNo: editForm.letterNo ?? null,
            date: editForm.date ?? null,
            subject: editForm.teleCorres ?? null,
            brief: editForm.briefContents ?? null,
            platoonCommanderName: editForm.sigPICdr ?? null,
        };

        await update(editingId, payload);
        cancelEdit();
    };

    return (
        <DashboardLayout title="Record of Communication with Parents/Guardian" description="Maintain communication details with parents or guardians.">
            <main className="flex-1 p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                        { label: "Parent Communication" },
                    ]}
                />

                {cadet && (
                    <div className="hidden md:flex sticky top-16 z-40">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <DossierTab tabs={dossierTabs} defaultValue="comn-parents" ocId={ocId} extraTabs={
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Mil-Trg
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                            {militaryTrainingCards.map(({ title, icon: Icon, color, to }) => {
                                const link = to(ocId);
                                return (
                                    <DropdownMenuItem key={title} asChild>
                                        <Link href={link} className="flex items-center gap-2">
                                            <Icon className={`h-4 w-4 ${color}`} />
                                            <span>{title}</span>
                                        </Link>
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                }>
                    <div style={{ width: "100%" }}>
                        <div className="max-w-6xl mx-auto space-y-6">
                            <Card className="p-6 rounded-2xl shadow-xl bg-white">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold text-center text-primary">
                                        RECORD OF COMMUNICATION WITH PARENTS / GUARDIAN
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <div className="flex justify-center mb-6 space-x-2">
                                        {semesters.map((sem, index) => {
                                            return (
                                                <button
                                                    key={sem}
                                                    type="button"
                                                    onClick={() => setActiveTab(index)}
                                                    className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === index ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                                                >
                                                    {sem}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Saved Data Table */}
                                    <div className="overflow-x-auto border rounded-lg shadow mb-6">
                                        {loading ? (
                                            <p className="text-center p-4">Loading...</p>
                                        ) : grouped[activeTab]?.length === 0 ? (
                                            <p className="text-center p-4 text-gray-500">No data submitted yet for this semester.</p>
                                        ) : (
                                            <ParentCommTable
                                                rows={grouped[activeTab]}
                                                loading={loading}
                                                onEditSave={async (id, payload) => {
                                                    await update(id, payload);
                                                }}
                                                onDelete={handleDelete}
                                            />
                                        )}
                                    </div>

                                    {/* Input Form */}
                                    <ParentCommForm
                                        onSubmit={async (formData) => {
                                            // onSubmit will send payloads for the activeTab semester
                                            const payloads: ParentCommPayload[] = formData.records.map((r) => ({
                                                semester: activeTab + 1,
                                                mode: "LETTER",
                                                refNo: r.letterNo ?? "",
                                                date: r.date ?? "",
                                                subject: r.teleCorres ?? "",
                                                brief: r.briefContents ?? "",
                                                platoonCommanderName: r.sigPICdr ?? "",
                                            }));
                                            await save(activeTab + 1, payloads);
                                        }}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}