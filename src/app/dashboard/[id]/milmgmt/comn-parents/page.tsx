"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
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
import { useParentComms, ParentCommRow } from "@/hooks/useParentComms";
import ParentCommTable from "@/components/parent/ParentCommTable";
import { useOcDetails } from "@/hooks/useOcDetails";
import Link from "next/link";
import { ParentCommPayload } from "@/app/lib/api/parentComnApi";
import type { RootState } from "@/store";
import { clearParentCommForm } from "@/store/slices/parentCommSlice";

export default function ParentCommnPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    // Redux
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.parentComm.forms[ocId]
    );

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

        // Filter out empty rows
        const filledRows = data.records.filter(row => {
            const hasData =
                (row.letterNo && row.letterNo.trim() !== "") ||
                (row.date && row.date.trim() !== "") ||
                (row.teleCorres && row.teleCorres.trim() !== "") ||
                (row.briefContents && row.briefContents.trim() !== "") ||
                (row.sigPICdr && row.sigPICdr.trim() !== "");
            return hasData;
        });

        if (filledRows.length === 0) {
            toast.error("Please fill in at least one record with data");
            return;
        }

        const payloads: ParentCommPayload[] = filledRows.map((r) => ({
            semester: activeTab + 1,
            mode: "LETTER",
            refNo: r.letterNo ?? null,
            date: r.date ?? "",
            subject: r.teleCorres ?? "",
            brief: r.briefContents ?? "",
            platoonCommanderName: r.sigPICdr ?? null,
        }));

        await save(activeTab + 1, payloads);

        // Clear Redux cache after successful save
        dispatch(clearParentCommForm(ocId));

        toast.success("Parent communication records saved successfully!");
    };

    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearParentCommForm(ocId));
            toast.info("Form cleared");
        }
    };

    // delete
    const handleDelete = async (row: ParentCommRow) => {
        if (!row.id) return;
        await remove(row.id);
    };

    // Get default values - prioritize Redux over empty form
    const getDefaultValues = (): ParentCommFormData => {
        if (savedFormData && savedFormData.length > 0) {
            return {
                records: savedFormData,
            };
        }

        return {
            records: [
                { letterNo: "", date: "", teleCorres: "", briefContents: "", sigPICdr: "" },
            ],
        };
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
                                        key={`${ocId}-${savedFormData ? 'redux' : 'default'}`}
                                        onSubmit={handleSubmit}
                                        defaultValues={getDefaultValues()}
                                        ocId={ocId}
                                        onClear={handleClearForm}
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