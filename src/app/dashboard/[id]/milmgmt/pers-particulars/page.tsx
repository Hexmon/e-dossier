"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Shield, Settings } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import DossierTab from "@/components/Tabs/DossierTab";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";

import { useOcPersonal } from "@/hooks/useOcPersonal";
import { OCPersonalRecord } from "@/app/lib/api/ocPersonalApi";
import { toast } from "sonner";
import PersonalForm from "@/components/pers/PersonalForm";
import Link from "next/link";
import type { RootState } from "@/store";
import { savePersonalForm, clearPersonalForm } from "@/store/slices/personalParticularsSlice";
import { useDebounce } from "@/hooks/useDebounce";
import { resolveToneClasses } from "@/lib/theme-color";

export default function PersParticularsPage() {

    // ---------------------------
    // DYNAMIC ROUTE ID
    // ---------------------------
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    // ---------------------------
    // REDUX
    // ---------------------------
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.personalParticulars.forms[ocId]
    );

    // ---------------------------
    // USE PERSONAL HOOK
    // ---------------------------
    const {
        cadet,
        personal,
        savePersonal,
        setPersonal
    } = useOcPersonal(ocId);

    const [isEditing, setIsEditing] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // ---------------------------
    // REACT HOOK FORM
    // ---------------------------
    const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm<OCPersonalRecord>({
        defaultValues: {} as OCPersonalRecord,
    });

    // Watch all form values for auto-save
    const formValues = watch();
    const debouncedFormValues = useDebounce(formValues, 500);

    // ---------------------------
    // UPDATE MERGE UTILITY
    // ---------------------------
    function mergeUpdatePayload<T extends object>(form: Partial<T>, saved: T): T {
        const output = { ...saved } as T;

        (Object.keys(saved) as (keyof T)[]).forEach((key) => {
            const newValue = form[key];
            const oldValue = saved[key];

            const finalValue =
                newValue === undefined || newValue === null
                    ? (oldValue ?? "")
                    : newValue === ""
                        ? ""
                        : newValue;

            output[key] = finalValue as T[typeof key];
        });

        return output;
    }

    // ---------------------------
    // PRELOAD FORM DATA - SMART MERGE VERSION
    // ---------------------------
    useEffect(() => {
        if (!cadet || !personal) return;

        // Transform API data
        const {
            ocNumber,
            name: cadetName,
            courseName
        } = cadet;

        const {
            pi,
            dob,
            bloodGroup
        } = personal;

        const transformedApiData: OCPersonalRecord = {
            ...personal,
            no: ocNumber,
            name: cadetName,
            pl: pi ?? "",
            dob: dob ? dob.split("T")[0] : "",
            bloodGp: bloodGroup ?? "",
            course: courseName ?? "",
        };

        // Smart merge: Prioritize API data, but use Redux data for empty API fields
        if (savedFormData) {
            console.log("Merging API data with Redux fallback");

            const mergedData: Partial<OCPersonalRecord> = { ...transformedApiData };

            // For each field, check if API value is empty, if so use Redux value
            (Object.keys(transformedApiData) as (keyof OCPersonalRecord)[]).forEach((key) => {
                const apiValue = transformedApiData[key];
                const reduxValue = savedFormData[key];

                // If API value is empty/null/undefined, use Redux value as fallback
                const isApiEmpty = apiValue === null || apiValue === undefined || apiValue === "";
                const hasReduxValue = reduxValue !== null && reduxValue !== undefined && reduxValue !== "";

                if (isApiEmpty && hasReduxValue) {
                    (mergedData as Record<string, unknown>)[key] = reduxValue;
                } else {
                    // Use API value (whether it's filled or empty)
                    (mergedData as Record<string, unknown>)[key] = apiValue;
                }
            });

            console.log("Merged data:", mergedData);
            reset(mergedData as OCPersonalRecord);
        } else {
            console.log("Loading from API:", transformedApiData);
            reset(transformedApiData);
        }

        setIsInitialized(true);
    }, [cadet, personal, savedFormData, reset]);

    // ---------------------------
    // AUTO-SAVE TO REDUX (DEBOUNCED)
    // ---------------------------
    useEffect(() => {
        if (!isInitialized) return; // Don't auto-save until initial load is complete

        if (isEditing && debouncedFormValues && Object.keys(debouncedFormValues).length > 0) {
            const hasAnyData = Object.values(debouncedFormValues).some(val => {
                return val !== null && val !== undefined && val !== "";
            });

            if (hasAnyData) {
                console.log("Auto-saving to Redux:", debouncedFormValues);
                dispatch(savePersonalForm({
                    ocId,
                    data: debouncedFormValues as OCPersonalRecord
                }));
            }
        }
    }, [debouncedFormValues, dispatch, ocId, isEditing, isInitialized]);

    // ---------------------------
    // SAVE HANDLER
    // ---------------------------
    const onSubmit = async (formData: OCPersonalRecord): Promise<void> => {
        if (!ocId) {
            toast.error("No cadet selected");
            return;
        }

        try {
            let payload: OCPersonalRecord;

            if (!personal) {
                // CREATE
                const { pl, bloodGp, swimmer } = formData;

                const swimmerBool =
                    swimmer === true ||
                    String(swimmer) === "on" ||
                    String(swimmer) === "true";

                payload = {
                    ...formData,
                    ocId,
                    pi: pl,
                    bloodGroup: bloodGp,
                    swimmer: swimmerBool,
                };

            } else {
                // UPDATE
                const merged = mergeUpdatePayload<OCPersonalRecord>(
                    formData,
                    personal
                );

                const swimmer = merged.swimmer;

                const swimmerBool =
                    swimmer === true ||
                    String(swimmer) === "on" ||
                    String(swimmer) === "true";

                payload = {
                    ...merged,
                    ocId,
                    swimmer: swimmerBool,
                };
            }

            const saved = await savePersonal(payload);

            if (!saved) {
                toast.error("Failed to save data");
                return;
            }

            reset(saved);
            setIsEditing(false);

            // Clear redux cache after successful save
            console.log("Clearing Redux cache after successful save");
            dispatch(clearPersonalForm(ocId));

            toast.success("Saved successfully!");

        } catch {
            toast.error("Error saving");
        }
    };

    // ---------------------------
    // CLEAR FORM HANDLER
    // ---------------------------
    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            console.log("Clearing Redux cache manually");
            dispatch(clearPersonalForm(ocId));

            if (cadet && personal) {
                const {
                    ocNumber,
                    name: cadetName,
                    courseName
                } = cadet;

                const {
                    pi,
                    dob,
                    bloodGroup
                } = personal;

                const transformed: OCPersonalRecord = {
                    ...personal,
                    no: ocNumber,
                    name: cadetName,
                    pl: pi ?? "",
                    dob: dob ? dob.split("T")[0] : "",
                    bloodGp: bloodGroup ?? "",
                    course: courseName ?? "",
                };

                reset(transformed);
            }
            setIsEditing(false);
            toast.info("Form cleared");
        }
    };

    // ---------------------------
    // RENDER
    // ---------------------------
    return (
        <DashboardLayout title="Personal Particulars" description="Record and manage details">
            <main className="p-6">

                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                        { label: "Pers Particulars" },
                    ]}
                />

                {cadet && (
                    <SelectedCadetTable
                        selectedCadet={{
                            name: cadet.name ?? "",
                            courseName: cadet.courseName ?? "",
                            ocNumber: cadet.ocNumber ?? "",
                            ocId: cadet.ocId ?? "",
                            course: cadet.course ?? "",
                        }}
                    />
                )}

                <DossierTab
                    tabs={dossierTabs}
                    defaultValue="pers-particulars"
                    ocId={ocId}
                    extraTabs={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" /> Mil-Trg
                                </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                                {militaryTrainingCards.map((card) => {
                                    const link = card.to(ocId);

                                    return (
                                        <DropdownMenuItem key={card.title} asChild>
                                            <Link href={link} className="flex items-center gap-2">
                                                <card.icon className={`h-4 w-4 ${resolveToneClasses(card.color, "text")}`} />
                                                {card.title}
                                            </Link>
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                >
                    <TabsContent value="pers-particulars">
                        <Card className="shadow-lg rounded-xl p-6">
                            <CardHeader>
                                <CardTitle>Personal Particulars</CardTitle>
                            </CardHeader>

                            <CardContent>
                                {isEditing && (
                                    <div className="text-xs text-muted-foreground text-right mb-4">
                                        ✓ Changes are saved automatically
                                    </div>
                                )}

                                <PersonalForm
                                    register={register}
                                    handleSubmit={handleSubmit}
                                    reset={reset}
                                    control={control}
                                    errors={errors}
                                    savedData={personal ?? null}
                                    isEditing={isEditing}
                                    setIsEditing={setIsEditing}
                                    onSubmit={onSubmit}
                                    onClear={handleClearForm}
                                />
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
        </DashboardLayout>
    );
}
