"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
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
import { Shield, ChevronDown } from "lucide-react";
import Link from "next/link";

import { updateOcDetentionRecord } from "@/app/lib/api/detentionApi";
import { toast } from "sonner";
import { useOcDetails } from "@/hooks/useOcDetails";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { saveDetentionForm, clearDetentionForm } from "@/store/slices/detentionRecordsSlice";
import { Cadet } from "@/types/cadet";

export default function DetentionPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";
    const dispatch = useDispatch();

    // Get saved form data from Redux
    const savedFormData = useSelector((state: RootState) =>
        state.detentionRecords.forms[ocId]
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
    const getDefaultValues = (): DetentionFormValues => {
        if (savedFormData && savedFormData.length > 0) {
            return {
                detentionRows: savedFormData.map(row => ({
                    ...row,
                    id: row.id ?? null, // ✅ force undefined → null
                })),
            };
        }
        return { detentionRows: defaultDetentionRows };
    };

    const methods = useForm<DetentionFormValues>({
        defaultValues: getDefaultValues(),
    });

    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearDetentionForm(ocId));
            methods.reset({ detentionRows: defaultDetentionRows });
            toast.info("Form cleared");
        }
    };

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
                    <InnerDetentionPage
                        selectedCadet={selectedCadet}
                        ocId={ocId}
                        onClearForm={handleClearForm}
                    />
                </FormProvider>
            </main>
        </DashboardLayout>
    );
}

/* Inner Component */
function InnerDetentionPage({
    selectedCadet,
    ocId,
    onClearForm
}: {
    selectedCadet: Cadet;
    ocId: string;
    onClearForm: () => void;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const { control, register, setValue, handleSubmit, getValues, watch } =
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

    const semParam = searchParams.get("semester");
    const resolvedTab = useMemo(() => {
        const parsed = Number(semParam);
        if (!Number.isFinite(parsed)) return 0;
        const idx = parsed - 1;
        if (idx < 0 || idx >= semesters.length) return 0;
        return idx;
    }, [semParam]);
    const [activeTab, setActiveTab] = useState<number>(resolvedTab);
    const [savedData, setSavedData] = useState<DetentionRow[][]>(
        semesters.map(() => [])
    );

    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editingValues, setEditingValues] = useState<Partial<DetentionRow> | null>(
        null
    );

    const [refreshFlag, setRefreshFlag] = useState(0);

    useEffect(() => {
        setActiveTab(resolvedTab);
    }, [resolvedTab]);

    const updateSemesterParam = (index: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("semester", String(index + 1));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleSemesterChange = (index: number) => {
        setActiveTab(index);
        updateSemesterParam(index);
        cancelEdit();
    };

    // Auto-save to Redux on form changes
    useEffect(() => {
        const subscription = watch((value) => {
            if (ocId && value.detentionRows && value.detentionRows.length > 0) {
                const formData = value.detentionRows.map(row => ({
                    id: row?.id || null,
                    semester: row?.semester || 1,
                    reason: row?.reason || "",
                    type: row?.type || "DETENTION",
                    dateFrom: row?.dateFrom || "",
                    dateTo: row?.dateTo || "",
                    remark: row?.remark || "",
                }));

                dispatch(saveDetentionForm({ ocId, data: formData }));
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, dispatch, ocId]);

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
        // Set semester for all new rows before submission
        const rows = getValues().detentionRows;
        rows.forEach((_, index) => {
            setValue(`detentionRows.${index}.semester`, activeTab + 1);
        });

        await submitDetention();
        toast.success("New detention records saved");

        // Clear Redux cache after successful save
        dispatch(clearDetentionForm(ocId));

        // Reset form to defaults
        setValue("detentionRows", defaultDetentionRows);

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
                <Card className="max-w-6xl mx-auto p-6 shadow bg-card">
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
                                    onClick={() => handleSemesterChange(idx)}
                                    className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-foreground"
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
