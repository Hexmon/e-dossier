"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown, Link } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

import { useOcDetails } from "@/hooks/useOcDetails";
import { semestersCfe } from "@/constants/app.constants";

import { cfeFormData } from "@/types/cfe";
import { useCfeRecords } from "@/hooks/useCfeRecords";
import CfeTable from "@/components/cfe/CfeTable";
import CfeForm from "@/components/cfe/CfeForm";
import type { cfeRow } from "@/types/cfe";

import type { RootState } from "@/store";
import { clearCfeForm } from "@/store/slices/cfeRecordsSlice";

export default function CFEFormPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Redux
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.cfeRecords.forms[ocId]
    );

    const { cadet } = useOcDetails(ocId);

    const {
        name = "",
        courseName = "",
        ocNumber = "",
        ocId: cadetOcId = ocId,
        course = "",
    } = cadet ?? {};

    const selectedCadet = { name, courseName, ocNumber, ocId: cadetOcId, course };

    const semesters =
        Array.isArray(semestersCfe) && semestersCfe.length > 0
            ? semestersCfe
            : ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];

    const {
        groups,
        loading,
        fetchAll,
        saveSemesterPayload,
        replaceSemesterPayload,
        deleteRecordById,
    } = useCfeRecords(ocId, semesters.length);

    const semParam = searchParams.get("semester");
    const resolvedTab = useMemo(() => {
        const parsed = Number(semParam);
        if (!Number.isFinite(parsed)) return 0;
        const idx = parsed - 1;
        if (idx < 0 || idx >= semesters.length) return 0;
        return idx;
    }, [semParam, semesters.length]);
    const [activeTab, setActiveTab] = useState<number>(resolvedTab);

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
    };

    useEffect(() => {
        if (!ocId) {
            return;
        }
        fetchAll();
    }, [ocId, fetchAll]);

    // create payload by appending new records to existing group's items
    const handleSubmit = async (data: cfeFormData) => {
        const termIndex = activeTab;
        await saveSemesterPayload(termIndex, data.records);

        // Clear Redux cache after successful save
        dispatch(clearCfeForm(ocId));

        toast.success("CFE records saved successfully!");
    };

    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearCfeForm(ocId));
            toast.info("Form cleared");
        }
    };

    // replace an entire semester payload (used by inline-edit save)
    const handleReplaceSemester = async (semesterIndex: number, items: { cat: string; marks: number; remarks?: string; sub_category?: string }[]) => {
        await replaceSemesterPayload(semesterIndex, items);
    };

    // Handle delete of a specific row
    const handleDelete = async (rowIndex: number, semesterIndex: number, allRows: cfeRow[]) => {
        // Filter out the row at rowIndex
        const remainingRows = allRows.filter((_, idx) => idx !== rowIndex);

        // If no rows left, delete the entire record
        if (remainingRows.length === 0) {
            // Get the id of the record to delete
            const recordId = allRows[0]?.id;
            if (recordId) {
                await deleteRecordById(recordId);
            }
            return;
        }

        // If rows remain, update the semester with remaining rows
        const itemsToSave = remainingRows.map((row) => ({
            cat: row.cat ?? "",
            marks: Number(row.mks) || 0,
            remarks: row.remarks ?? "",
            sub_category: row.sub_category ?? "",
        }));

        await replaceSemesterPayload(semesterIndex, itemsToSave);
    };

    // Get default values - prioritize Redux over empty form
    const getDefaultValues = (): cfeFormData => {
        if (savedFormData && savedFormData.length > 0) {
            return {
                records: savedFormData,
            };
        }

        return {
            records: [
                {
                    serialNo: "1",
                    cat: "",
                    mks: "",
                    remarks: "",
                    sub_category: "",
                },
            ],
        };
    };

    return (
        <DashboardLayout
            title="Credit For Excellence (CFE)"
            description="Manage and record cadet's CFE scores and evaluation details."
        >
            <main className="flex-1 p-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                        { label: "Credit For Excellence" },
                    ]}
                />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="credit-excellence"
                    ocId={ocId}
                    extraTabs={
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
                                                {title}
                                            </Link>
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                >
                    <TabsContent value="credit-excellence">
                        <Card className="max-w-6xl mx-auto p-6 rounded-2xl shadow bg-card">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-center">
                                    CREDIT FOR EXCELLENCE (CFE)
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                <div className="flex justify-center mb-6 space-x-2">
                                    {semesters.map((s, idx) => {
                                        return (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => handleSemesterChange(idx)}
                                                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === idx
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted text-foreground hover:bg-muted/80"
                                                    }`}
                                            >
                                                {s}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Display all existing records for selected semester */}
                                <div className="mb-8">
                                    <h3 className="text-sm font-semibold text-foreground mb-3">
                                        {semesters[activeTab]} - All Records
                                    </h3>
                                    <CfeTable
                                        rows={groups[activeTab] ?? []}
                                        loading={loading}
                                        onReplaceSemester={handleReplaceSemester}
                                        onDelete={handleDelete}
                                        semesterIndex={activeTab}
                                    />
                                </div>

                                {/* Form to add new records */}
                                <div className="mt-6">
                                    <h3 className="text-sm font-semibold text-foreground mb-3">
                                        Add New Records for {semesters[activeTab]}
                                    </h3>
                                    <CfeForm
                                        key={`${ocId}-${savedFormData ? 'redux' : 'default'}`}
                                        onSubmit={handleSubmit}
                                        semIndex={activeTab}
                                        existingRows={groups[activeTab] ?? []}
                                        loading={loading}
                                        ocId={ocId}
                                        defaultValues={getDefaultValues()}
                                        onClear={handleClearForm}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </DossierTab>
            </main>
        </DashboardLayout>
    );
}
