"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Shield, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { PageHeader } from "@/components/layout/PageHeader";
import DossierTab from "@/components/Tabs/DossierTab";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useEffect, useState } from "react";
import {
    createOCPersonal,
    getOCPersonal,
    OCPersonalRecord,
    updateOCPersonal
} from "@/app/lib/api/ocPersonalApi";
import { toast } from "sonner";
import { dsFieldMap } from "@/constants/app.constants";
import { fetchCourseById } from "@/app/lib/api/courseApi";

interface PersonalData {
    [key: string]: string | boolean;
}

export default function PersParticularsPage() {
    const [savedData, setSavedData] = useState<OCPersonalRecord | null>(null);
    const [courseName, setCourseName] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const router = useRouter();
    const selectedCadet = useSelector(
        (state: RootState) => state.cadet.selectedCadet
    );

    const { register, handleSubmit, reset } = useForm<OCPersonalRecord>({
        defaultValues: {} as OCPersonalRecord,
    });

    /** ---------------- Fetch Personal Data ---------------- */
    const fetchPersonalData = async () => {
        if (!selectedCadet?.ocId) return;

        try {
            const response = await getOCPersonal(selectedCadet.ocId);

            const res = await fetchCourseById(selectedCadet.course);
            console.log("Course response:", res);

            const courseCode = res?.course?.code || "";
            console.log("Course code:", courseCode);

            setCourseName(courseCode);

            if (response) {
                const transformed: OCPersonalRecord = {
                    ...response,
                    no: selectedCadet.ocNumber,
                    name: selectedCadet.name,
                    pl: response.pi ?? "",
                    dob: response.dob ? response.dob.split("T")[0] : "",
                    bloodGp: response.bloodGroup ?? "",
                    course: courseCode,
                };

                setSavedData(transformed);
                reset(transformed);
                setIsEditing(false);
            } else {
                setSavedData(null);
                reset({} as OCPersonalRecord);
            }
        } catch (err) {
            console.error(err);
            setSavedData(null);
            reset({} as OCPersonalRecord);
        }
    };

    useEffect(() => {
        fetchPersonalData();
    }, [selectedCadet]);

    /** ---------------- SAVE DATA ---------------- */
    const onSubmit = async (data: PersonalData) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        const payload = {
            ...data,
            swimmer:
                data.swimmer === true ||
                data.swimmer === "true" ||
                data.swimmer === "on",
        };

        try {
            let saved: OCPersonalRecord;

            if (!savedData) {
                saved = await createOCPersonal(selectedCadet.ocId, payload);
                toast.success("Saved successfully!");
            } else {
                saved = await updateOCPersonal(selectedCadet.ocId, payload);
                toast.success("Updated successfully!");
            }

            setSavedData(saved);
            setIsEditing(false);
        } catch (err: any) {
            toast.error(err?.message || "Error saving");
        }
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <PageHeader
                        title="Personal Particulars"
                        description="Record and manage details"
                    />

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Dossier", href: "/dashboard/milmgmt" },
                                { label: "Pers Particulars" },
                            ]}
                        />

                        {selectedCadet &&
                            <SelectedCadetTable selectedCadet={selectedCadet} />
                        }

                        <DossierTab
                            tabs={dossierTabs}
                            defaultValue="pers-particulars"
                            extraTabs={
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <TabsTrigger value="pers-particulars">
                                            <Shield className="h-4 w-4" /> Mil-Trg
                                        </TabsTrigger>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                                        {militaryTrainingCards.map(card => (
                                            <DropdownMenuItem key={card.to} asChild>
                                                <a href={card.to} className="flex gap-2">
                                                    <card.icon className={`h-4 w-4 ${card.color}`} />
                                                    {card.title}
                                                </a>
                                            </DropdownMenuItem>
                                        ))}
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
                                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                                            {/* -------- PERSONAL INFO -------- */}
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Personal Information</CardTitle>
                                                </CardHeader>
                                                <CardContent className="grid grid-cols-2 gap-4">

                                                    {[
                                                        "no",
                                                        "name",
                                                        "course",
                                                        "visibleIdentMarks",
                                                        "pl",
                                                        "dob",
                                                        "placeOfBirth",
                                                        "domicile",
                                                        "religion",
                                                        "nationality",
                                                        "bloodGp",
                                                        "identMarks",
                                                    ].map(field => (
                                                        <div key={field}>
                                                            <label className="text-sm font-medium capitalize">
                                                                {field}
                                                            </label>
                                                            <Input
                                                                {...register(field)}
                                                                type={field === "dob" ? "date" : "text"}
                                                                disabled={!isEditing}
                                                            />
                                                        </div>
                                                    ))}

                                                </CardContent>
                                            </Card>

                                            {/* -------- FAMILY DETAILS -------- */}
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Family Details</CardTitle>
                                                </CardHeader>
                                                <CardContent className="grid grid-cols-2 gap-4">

                                                    {[
                                                        "fatherName",
                                                        "fatherMobile",
                                                        "fatherAddrPerm",
                                                        "fatherAddrPresent",
                                                        "fatherProfession",
                                                        "guardianName",
                                                        "guardianAddress",
                                                        "monthlyIncome",
                                                        "nokDetails",
                                                        "nokAddrPerm",
                                                        "nokAddrPresent",
                                                        "nearestRailwayStation",
                                                        "familyInSecunderabad",
                                                        "relativeInArmedForces",
                                                        "govtFinancialAssistance",
                                                    ].map(field => (
                                                        <div key={field}>
                                                            <label className="text-sm font-medium capitalize">{field}</label>

                                                            {field === "govtFinancialAssistance" ? (
                                                                <input
                                                                    type="checkbox"
                                                                    {...register(field)}
                                                                    disabled={!isEditing}
                                                                />
                                                            ) : null}

                                                            {field === "monthlyIncome" ? (
                                                                <Input
                                                                    type="number"
                                                                    {...register(field, { valueAsNumber: true })}
                                                                    disabled={!isEditing}
                                                                />
                                                            ) : null}

                                                            {field !== "govtFinancialAssistance" &&
                                                                field !== "monthlyIncome" ? (
                                                                <Input
                                                                    type="text"
                                                                    {...register(field)}
                                                                    disabled={!isEditing}
                                                                />
                                                            ) : null}
                                                        </div>
                                                    ))}


                                                </CardContent>
                                            </Card>

                                            {/* -------- CONTACT DETAILS -------- */}
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Contact & IDs</CardTitle>
                                                </CardHeader>

                                                <CardContent className="grid grid-cols-2 gap-4">
                                                    {[
                                                        "mobileNo",
                                                        "email",
                                                        "passportNo",
                                                        "panNo",
                                                        "aadhaarNo",
                                                        "bankDetails",
                                                        "idenCardNo",
                                                        "upscRollNo",
                                                        "ssbCentre",
                                                    ].map(field => (
                                                        <div key={field}>
                                                            <label className="text-sm font-medium capitalize">{field}</label>
                                                            <Input {...register(field)} disabled={!isEditing} />
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>

                                            {/* -------- OTHER INFO -------- */}
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Other Information</CardTitle>
                                                </CardHeader>

                                                <CardContent className="grid grid-cols-2 gap-4">
                                                    {["games", "hobbies", "languages"].map(field => (
                                                        <div key={field}>
                                                            <label className="text-sm font-medium capitalize">{field}</label>
                                                            <Input {...register(field)} disabled={!isEditing} />
                                                        </div>
                                                    ))}

                                                    {/* Checkbox */}
                                                    <div className="flex items-center gap-2 mt-4">
                                                        <label className="text-sm font-medium w-32">Swimmer</label>
                                                        <input
                                                            type="checkbox"
                                                            {...register("swimmer")}
                                                            disabled={!isEditing}
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* -------- DS DETAILS -------- */}
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>DS Details</CardTitle>
                                                </CardHeader>

                                                <CardContent className="space-y-4">
                                                    {["PI Cdr", "Dy Cdr", "Cdr"].map(role => (
                                                        <div key={role} className="border p-4 rounded-lg space-y-3">
                                                            <h3 className="font-semibold">{role}</h3>

                                                            {[
                                                                role === "PI Cdr" ? "SS/IC No" : "IC No",
                                                                "Rank",
                                                                "Name",
                                                                "Unit/Arm",
                                                                "Mobile No",
                                                            ].map(field => {
                                                                const uiName = `${role}-${field
                                                                    .toLowerCase()
                                                                    .replace(" ", "-")}`;

                                                                const backendKey = dsFieldMap[uiName];

                                                                return (
                                                                    <div key={uiName}>
                                                                        <label className="text-sm font-medium">{field}</label>
                                                                        <Input
                                                                            {...register(
                                                                                backendKey as keyof OCPersonalRecord
                                                                            )}
                                                                            disabled={!isEditing}
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>

                                            {/* -------- BUTTONS -------- */}
                                            <div className="flex justify-center gap-3">

                                                {!isEditing ? (
                                                    <Button
                                                        className="w-[200px]"
                                                        type="button"
                                                        onClick={() => setIsEditing(true)}
                                                    >
                                                        Edit
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            className="w-[200px]"
                                                            type="button"
                                                            onClick={() => {
                                                                reset(savedData || {});
                                                                setIsEditing(false);
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>

                                                        <Button type="submit" className="w-[200px]">
                                                            Save
                                                        </Button>
                                                    </>
                                                )}

                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="mil-trg">
                                <div className="text-center py-12">
                                    <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-semibold">
                                        Military Training Section
                                    </h3>
                                </div>
                            </TabsContent>
                        </DossierTab>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
