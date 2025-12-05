"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { Shield, Settings, Link } from "lucide-react";
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

export default function PersParticularsPage() {

    // ---------------------------
    // DYNAMIC ROUTE ID
    // ---------------------------
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

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

    // ---------------------------
    // REACT HOOK FORM
    // ---------------------------
    const { register, handleSubmit, reset } = useForm<OCPersonalRecord>({
        defaultValues: {} as OCPersonalRecord,
    });

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
    // PRELOAD FORM DATA
    // ---------------------------
    useEffect(() => {
        if (!cadet || !personal) return;

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
    }, [cadet, personal, reset]);

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
            toast.success("Saved successfully!");

        } catch {
            toast.error("Error saving");
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
                                                <card.icon className={`h-4 w-4 ${card.color}`} />
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
                                <PersonalForm
                                    register={register}
                                    handleSubmit={handleSubmit}
                                    reset={reset}
                                    savedData={personal ?? null}
                                    isEditing={isEditing}
                                    setIsEditing={setIsEditing}
                                    onSubmit={onSubmit}
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
