"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import DossierTab from "@/components/Tabs/DossierTab";

import { useForm, useFieldArray, FormProvider, useFormContext } from "react-hook-form";

import {
    DetentionFormValues,
    defaultDetentionRows,
    DetentionRow,
} from "@/types/detention";

import DetentionForm from "@/components/detention/DetentionForm";
import { useDetentionActions } from "@/hooks/useDetentionActions";

import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { semesters } from "@/constants/app.constants";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ChevronDown, Link } from "lucide-react";

import { updateOcDetentionRecord } from "@/app/lib/api/detentionApi";
import { toast } from "sonner";
import { useOcDetails } from "@/hooks/useOcDetails";
import { useParams } from "next/navigation";

export default function DetentionPage() {
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

    const methods = useForm<DetentionFormValues>({
        defaultValues: { detentionRows: defaultDetentionRows },
    });

    return (
        <DashboardLayout
            title="Detention Records"
            description="Manage Detention records"
        >
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${id}/milmgmt` },
                        { label: "Detention Records" },
                    ]}
                />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <FormProvider {...methods}>
                    <InnerDetentionPage selectedCadet={selectedCadet} ocId={ocId}/>
                </FormProvider>
            </main>
        </DashboardLayout>
    );
}

/* Inner Component */
function InnerDetentionPage({ selectedCadet, ocId }: { selectedCadet: RootState['cadet']['selectedCadet']; ocId: string; }) {
    const { control, register, setValue, handleSubmit } =
        useFormContext<DetentionFormValues>();

    const { fields, append, remove } = useFieldArray({
        control,
        name: "detentionRows",
    });

    const {
        submitDetention,
        fetchDetention,
        deleteSavedDetention,
    } = useDetentionActions(selectedCadet);

    const [activeTab, setActiveTab] = useState<number>(0);
    const [savedData, setSavedData] = useState<DetentionRow[][]>(
        semesters.map(() => [])
    );

    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editingValues, setEditingValues] = useState<Partial<DetentionRow> | null>(
        null
    );

    const [refreshFlag, setRefreshFlag] = useState(0);

    useEffect(() => {
        if (!selectedCadet) return;

        const load = async () => {
            const items = await fetchDetention();
            const grouped = semesters.map((_, idx) =>
                items.filter((x) => Number(x.semester) === idx + 1)
            );
            setSavedData(grouped);
        };

        load();
    }, [selectedCadet, refreshFlag]);

    const beginEdit = (row: DetentionRow) => {
        setEditingRowId(row.id ?? null);
        setEditingValues({ ...row });
    };

    const setEditingField = (field: keyof DetentionRow, value: any) => {
        setEditingValues((prev) => ({ ...(prev ?? {}), [field]: value }));
    };

    const cancelEdit = () => {
        setEditingRowId(null);
        setEditingValues(null);
    };

    const saveInlineEdit = async (rowIndex: number) => {
        if (!editingValues || !editingValues.id) return;

        try {
            await updateOcDetentionRecord(ocId, editingValues.id, {
                semester: editingValues.semester,
                reason: editingValues.reason,
                type: "DETENTION",
                dateFrom: editingValues.dateFrom,
                dateTo: editingValues.dateTo,
                remark: editingValues.remark,
            });

            toast.success("Detention record updated");
            cancelEdit();
            setRefreshFlag((f) => f + 1);
        } catch (err) {
            console.error(err);
            toast.error("Failed to update detention record");
        }
    };

    const handleDeleteSaved = async (index: number) => {
        const row = savedData[activeTab][index];
        if (!row || !row.id) return;

        const ok = await deleteSavedDetention(row.id);
        if (!ok) return;

        setRefreshFlag((f) => f + 1);
    };

    const handleNewSubmit = handleSubmit(async () => {
        await submitDetention();
        toast.success("New detention records saved");
        setRefreshFlag((f) => f + 1);
    });

    return (
        <DossierTab
            tabs={dossierTabs}
            defaultValue="detention"
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
            <TabsContent value="detention" className="space-y-6">
                <Card className="max-w-6xl mx-auto p-6 shadow bg-white">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-center">
                            RECORD OF DETENTION : ALL TERMS
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

                        <DetentionForm
                            register={register}
                            fields={fields}
                            append={append}
                            remove={remove}
                            savedRows={savedData[activeTab].filter(
                                (row) => row.type === "DETENTION"
                            )}
                            onEditRow={beginEdit}
                            onDeleteSaved={handleDeleteSaved}
                            editingRowId={editingRowId}
                            editingValues={editingValues}
                            setEditingField={setEditingField}
                            saveInlineEdit={saveInlineEdit}
                            cancelInlineEdit={cancelEdit}
                            onSubmit={handleNewSubmit}
                            onReset={() => setValue("detentionRows", defaultDetentionRows)}
                        />
                    </CardContent>
                </Card>
            </TabsContent>
        </DossierTab>
    );
}
