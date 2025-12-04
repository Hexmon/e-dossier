"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import DossierTab from "@/components/Tabs/DossierTab";

import { useForm, useFieldArray, FormProvider, useFormContext } from "react-hook-form";

import { LeaveFormValues, defaultLeaveRows, LeaveRow } from "@/types/lve";
import LeaveForm from "@/components/leave/LeaveForm";
import { useLeaveActions } from "@/hooks/useLeaveActions";

import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { semesters } from "@/constants/app.constants";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ChevronDown } from "lucide-react";

import { updateOcLeaveRecord } from "@/app/lib/api/leaveApi";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { useOcDetails } from "@/hooks/useOcDetails";
import Link from "next/link";

export default function LeavePage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    // Load cadet data via hook (no redux)
    const { cadet } = useOcDetails(ocId);

    const {
        name = "",
        courseName = "",
        ocNumber = "",
        ocId: cadetOcId = ocId,
        course = "",
    } = cadet ?? {};

    const selectedCadet = {
        name,
        courseName,
        ocNumber,
        ocId: cadetOcId,
        course,
    };

    const methods = useForm<LeaveFormValues>({
        defaultValues: { leaveRows: defaultLeaveRows },
    });

    return (
        <DashboardLayout
            title="Leave / Overstay Leave Records"
            description="Maintain cadet leave history across semesters"
        >
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${id}/milmgmt` },
                        { label: "Leave Records" },
                    ]}
                />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <FormProvider {...methods}>
                    <InnerLeavePage selectedCadet={selectedCadet} ocId={ocId} />
                </FormProvider>
            </main>
        </DashboardLayout>
    );
}

// -----------------------------------------------------------
// INNER PAGE (with DossierTab present)
// -----------------------------------------------------------

function InnerLeavePage({ selectedCadet, ocId }: { selectedCadet: RootState['cadet']['selectedCadet']; ocId: string; }) {
    const { control, register, setValue, handleSubmit } = useFormContext<LeaveFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: "leaveRows" });

    const { submitLeave, fetchLeave, deleteLeave, deleteSavedLeave } = useLeaveActions(selectedCadet);

    const [activeTab, setActiveTab] = useState<number>(0);
    const [savedData, setSavedData] = useState<LeaveRow[][]>(semesters.map(() => []));

    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editingValues, setEditingValues] = useState<Partial<LeaveRow> | null>(null);
    const [refreshFlag, setRefreshFlag] = useState(0);

    const handleDeleteSaved = async (index: number) => {
        const row = savedData[activeTab][index];
        if (!row) return;

        if (!row.id) return;

        const ok = await deleteSavedLeave(row.id);
        if (!ok) return;
        setRefreshFlag((f) => f + 1);
        setSavedData(prev => {
            const next = [...prev];
            next[activeTab] = next[activeTab].filter((_, i) => i !== index);
            return next;
        });
    };

    useEffect(() => {
        if (!selectedCadet) return;

        const load = async () => {
            const items = await fetchLeave();
            const grouped = semesters.map((_, idx) =>
                items.filter((x) => Number(x.semester) === idx + 1)
            );
            setSavedData(grouped);
        };

        load();
    }, [selectedCadet, refreshFlag]);

    const beginEdit = (row: LeaveRow) => {
        setEditingRowId(row.id ?? null);
        setEditingValues({ ...row });
    };

    const setEditingField = (field: keyof LeaveRow, value: any) => {
        setEditingValues((prev) => ({ ...(prev ?? {}), [field]: value }));
    };

    const cancelEdit = () => {
        setEditingRowId(null);
        setEditingValues(null);
    };

    const saveInlineEdit = async (rowIndex: number) => {
        if (!editingValues || !editingValues.id) return;

        try {
            await updateOcLeaveRecord(ocId, editingValues.id, {
                semester: editingValues.semester,
                reason: editingValues.reason,
                type: "LEAVE",
                dateFrom: editingValues.dateFrom,
                dateTo: editingValues.dateTo,
                remark: editingValues.remark,
            });

            setSavedData((prev) => {
                const next = [...prev];
                next[activeTab] = next[activeTab].map((r, i) =>
                    i === rowIndex ? (editingValues as LeaveRow) : r
                );
                return next;
            });

            toast.success("Leave record updated");
            cancelEdit();
            setRefreshFlag((f) => f + 1);
        } catch (err) {
            console.error(err);
            toast.error("Failed to update record");
        }
    };

    return (
        <DossierTab
            tabs={dossierTabs}
            defaultValue="leave-record"
            ocId={ocId}
            extraTabs={
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <TabsTrigger value="miltrg" className="flex items-center gap-2">
                            <Shield className="h-4 w-4" /> Mil-Trg
                            <ChevronDown className="h-4 w-4" />
                        </TabsTrigger>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                        {militaryTrainingCards.map(({ title, icon: Icon, color, to }) => {
                            const link = to(ocId);
                            return (
                                <DropdownMenuItem key={title} asChild>
                                    <Link href={link} className="flex items-center gap-2">
                                        <Icon className={`h-4 w-4 ${color}`} />
                                        {title}
                                    </Link>
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            }
        >
            <TabsContent value="leave-record" className="space-y-6">
                <Card className="max-w-6xl mx-auto p-6 shadow bg-white">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-center">
                            RECORD OF LVE / OVERSTAY LVE : ALL TERMS
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        {/* Term Tabs */}
                        <div className="flex justify-center mb-6 space-x-2">
                            {semesters.map((term, idx) => {
                                return (
                                    <button
                                        key={term}
                                        onClick={() => {
                                            setActiveTab(idx);
                                            cancelEdit();
                                        }}
                                        className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                                            }`}
                                    >
                                        {term}
                                    </button>
                                )
                            })}
                        </div>

                        <LeaveForm
                            register={register}
                            fields={fields}
                            append={append}
                            remove={remove}
                            savedRows={savedData[activeTab]}
                            onEditRow={beginEdit}
                            onDeleteSaved={handleDeleteSaved}
                            editingRowId={editingRowId}
                            editingValues={editingValues}
                            setEditingField={setEditingField}
                            saveInlineEdit={saveInlineEdit}
                            cancelInlineEdit={cancelEdit}
                            onSubmit={handleSubmit(async () => {
                                await submitLeave();
                                toast.success("Leave records saved");
                                setRefreshFlag((f) => f + 1);
                            })}
                            onReset={() => setValue("leaveRows", defaultLeaveRows)}
                        />
                    </CardContent>
                </Card>
            </TabsContent>
        </DossierTab>
    );
}