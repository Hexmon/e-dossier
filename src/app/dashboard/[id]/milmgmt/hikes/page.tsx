// /app/dashboard/hike/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import DossierTab from "@/components/Tabs/DossierTab";

import { useForm, useFieldArray, FormProvider, useFormContext } from "react-hook-form";

import { HikeFormValues, defaultHikeRows, HikeRow } from "@/types/hike";
import HikeForm from "@/components/hike/HikeForm";
import { useHikeActions } from "@/hooks/useHikeActions";

import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import { semesters } from "@/constants/app.constants";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ChevronDown } from "lucide-react";
import Link from "next/link";

import { updateOcHikeRecord } from "@/app/lib/api/hikeApi";
import { toast } from "sonner";
import { useOcDetails } from "@/hooks/useOcDetails";
import { useParams } from "next/navigation";
import { saveHikeForm, clearHikeForm } from "@/store/slices/hikeRecordsSlice";
import { Cadet } from "@/types/cadet";

export default function HikePage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";
    const dispatch = useDispatch();

    // Get saved form data from Redux
    const savedFormData = useSelector((state: RootState) =>
        state.hikeRecords.forms[ocId]
    );

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

    // Initialize form with saved data or defaults
    const getDefaultValues = (): HikeFormValues => {
        if (savedFormData && savedFormData.length > 0) {
            return {
                hikeRows: savedFormData.map(row => ({
                    ...row,
                    id: row.id ?? null,
                    type: "HIKE",        
                })),
            };
        }
        return { hikeRows: defaultHikeRows };
    };


    const methods = useForm<HikeFormValues>({
        defaultValues: getDefaultValues(),
    });

    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearHikeForm(ocId));
            methods.reset({ hikeRows: defaultHikeRows });
            toast.info("Form cleared");
        }
    };

    return (
        <DashboardLayout title="Hike Records" description="Manage Hike records">
            <main className="p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${id}/milmgmt` },
                        { label: "Hike Records" },
                    ]}
                />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <FormProvider {...methods}>
                    <InnerHikePage
                        selectedCadet={selectedCadet}
                        ocId={ocId}
                        onClearForm={handleClearForm}
                    />
                </FormProvider>
            </main>
        </DashboardLayout>
    );
}

/* Inner component */
function InnerHikePage({
    selectedCadet,
    ocId,
    onClearForm
}: {
    selectedCadet: Cadet;
    ocId: string;
    onClearForm: () => void;
}) {
    const dispatch = useDispatch();
    const { control, register, setValue, handleSubmit, watch } = useFormContext<HikeFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: "hikeRows" });

    const { submitHike, fetchHike, deleteFormHike, deleteSavedHike } = useHikeActions(selectedCadet);

    const [activeTab, setActiveTab] = useState<number>(0);
    const [savedData, setSavedData] = useState<HikeRow[][]>(semesters.map(() => []));

    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editingValues, setEditingValues] = useState<Partial<HikeRow> | null>(null);

    const [refreshFlag, setRefreshFlag] = useState(0);

    // Auto-save to Redux on form changes
    useEffect(() => {
        const subscription = watch((value) => {
            if (ocId && value.hikeRows && value.hikeRows.length > 0) {
                const formData = value.hikeRows.map(row => ({
                    id: row?.id || null,
                    semester: row?.semester || 1,
                    reason: row?.reason || "",
                    type: row?.type || "HIKE",
                    dateFrom: row?.dateFrom || "",
                    dateTo: row?.dateTo || "",
                    remark: row?.remark || "",
                }));

                dispatch(saveHikeForm({ ocId, data: formData }));
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, dispatch, ocId]);

    useEffect(() => {
        if (!selectedCadet) return;

        const load = async () => {
            const items = await fetchHike();
            const grouped = semesters.map((_, idx) => items.filter((x) => Number(x.semester) === idx + 1));
            setSavedData(grouped);
        };

        load();
    }, [selectedCadet, refreshFlag]);

    const beginEdit = (row: HikeRow) => {
        setEditingRowId(row.id ?? null);
        setEditingValues({ ...row });
    };

    const setEditingField = (field: keyof HikeRow, value: any) => {
        setEditingValues((prev) => ({ ...(prev ?? {}), [field]: value }));
    };

    const cancelEdit = () => {
        setEditingRowId(null);
        setEditingValues(null);
    };

    const saveInlineEdit = async (rowIndex: number) => {
        if (!editingValues || !editingValues.id) return;

        try {
            await updateOcHikeRecord(ocId, editingValues.id, {
                semester: editingValues.semester,
                reason: editingValues.reason,
                type: "HIKE",
                dateFrom: editingValues.dateFrom,
                dateTo: editingValues.dateTo,
                remark: editingValues.remark,
            });

            toast.success("Hike record updated");
            cancelEdit();

            setRefreshFlag((f) => f + 1);
        } catch (err) {
            console.error(err);
            toast.error("Failed to update hike record");
        }
    };

    const handleDeleteSaved = async (index: number) => {
        const row = savedData[activeTab][index];
        if (!row || !row.id) return;

        const ok = await deleteSavedHike(row.id);
        if (!ok) return;

        setRefreshFlag((f) => f + 1);
    };

    const handleNewSubmit = handleSubmit(async () => {
        await submitHike();
        toast.success("New hike records saved");

        // Clear Redux cache after successful save
        dispatch(clearHikeForm(ocId));

        // Reset form to defaults
        setValue("hikeRows", defaultHikeRows);

        setRefreshFlag((f) => f + 1);
    });

    return (
        <DossierTab
            tabs={dossierTabs}
            defaultValue="hikes"
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
            <TabsContent value="hikes" className="space-y-6">
                <Card className="max-w-6xl mx-auto p-6 shadow bg-white">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-center">
                            RECORD OF HIKE : ALL TERMS
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

                        <HikeForm
                            register={register}
                            fields={fields}
                            append={append}
                            remove={remove}
                            savedRows={savedData[activeTab].filter(row => row.type === "HIKE")}
                            onEditRow={beginEdit}
                            onDeleteSaved={handleDeleteSaved}
                            editingRowId={editingRowId}
                            editingValues={editingValues}
                            setEditingField={setEditingField}
                            saveInlineEdit={saveInlineEdit}
                            cancelInlineEdit={cancelEdit}
                            onSubmit={handleNewSubmit}
                            onReset={onClearForm}
                        />

                        {/* Auto-save indicator */}
                        <p className="text-sm text-muted-foreground text-center mt-2">
                            * Changes are automatically saved
                        </p>
                    </CardContent>
                </Card>
            </TabsContent>
        </DossierTab>
    );
}