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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { createOCPersonal, getOCPersonal, OCPersonalRecord, updateOCPersonal } from "@/app/lib/api/ocPersonalApi";

interface PersonalData {
    [key: string]: string | boolean;
}

export default function PersParticularsPage() {
    const [savedData, setSavedData] = useState<OCPersonalRecord | null>(null);
    const router = useRouter();
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const { register, handleSubmit, reset, watch } = useForm<PersonalData>({
        defaultValues: {},
    });

    const handleBloodGroupUpdate = async () => {
        if (!selectedCadet?.ocId) {
            alert("No cadet selected");
            return;
        }

        try {
            const updated = await updateOCPersonal(selectedCadet.ocId, { bloodGp: "A+" });
            setSavedData(updated);
            alert("Blood group updated successfully!");
        } catch (err) {
            console.error("Failed to update blood group:", err);
            alert("Error updating blood group.");
        }
    };

    const fetchPersonalData = async () => {
        if (!selectedCadet?.ocId) {
            console.warn("No cadet selected — skipping data fetch.");
            return;
        }

        console.log(`Fetching personal data for cadet OC ID: ${selectedCadet.ocId}...`);

        try {
            const personals = await getOCPersonal(selectedCadet.ocId);

            console.log("Data successfully fetched from backend:", personals);

            if (personals.length > 0) {
                setSavedData(personals[0]);
                console.log("First record saved to state:", personals[0]);
            } else {
                setSavedData(null);
                console.log("ℹNo personal data found for this cadet.");
            }
        } catch (err) {
            console.error("Failed to load personal particulars:", err);
            setSavedData(null);
        }
    };

    useEffect(() => {
        fetchPersonalData();
    }, [selectedCadet]);




    const handleLogout = () => {
        router.push("/login");
        console.log("Logout clicked");
    };

    const onSubmit = async (data: PersonalData) => {
        if (!selectedCadet?.ocId) {
            alert("No cadet selected");
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
                alert("Personal particulars saved successfully!");
            }
            else {
                const updatableFields = [
                    "visibleIdentMarks",
                    "pi",
                    "dob",
                    "placeOfBirth",
                    "domicile",
                    "religion",
                    "nationality",
                    "bloodGroup",
                    "identMarks",
                    "mobileNo",
                    "email",
                    "passportNo",
                    "panNo",
                    "aadhaarNo",
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
                    "bankDetails",
                    "idenCardNo",
                    "upscRollNo",
                    "ssbCentre",
                    "games",
                    "hobbies",
                    "swimmer",
                    "languages",
                    "dsPiSsicNo",
                    "dsPiRank",
                    "dsPiName",
                    "dsPiUnitArm",
                    "dsPiMobile",
                    "dsDyIcNo",
                    "dsDyRank",
                    "dsDyName",
                    "dsDyUnitArm",
                    "dsDyMobile",
                    "dsCdrIcNo",
                    "dsCdrRank",
                    "dsCdrName",
                    "dsCdrUnitArm",
                    "dsCdrMobile",
                ] as const;

                const updatePayload = Object.fromEntries(
                    Object.entries(payload).filter(([key]) =>
                        updatableFields.includes(key as keyof typeof payload)
                    )
                );

                saved = await updateOCPersonal(selectedCadet.ocId, updatePayload);
                alert("Personal particulars updated successfully!");
            }

            setSavedData(saved);
        } catch (err: any) {
            console.error("Failed to save personal particulars:", err);
            alert(err?.message || "Error saving data.");
        }
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <PageHeader
                        title="Personal Particulars"
                        description="Record and manage personal details of cadets, including background information, identification, and essential documentation for reference."
                        onLogout={handleLogout}
                    />

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Dossier", href: "/dashboard/milmgmt" },
                                { label: "Pers Particulars" },
                            ]}
                        />

                        {selectedCadet && <SelectedCadetTable selectedCadet={selectedCadet} />}

                        <DossierTab
                            tabs={dossierTabs}
                            defaultValue="pers-particulars"
                            extraTabs={
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <TabsTrigger value="pers-particulars" className="flex items-center gap-2">
                                            <Shield className="h-4 w-4" />
                                            Mil-Trg
                                        </TabsTrigger>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-96 max-h-64 overflow-y-auto">
                                        {militaryTrainingCards.map((card) => (
                                            <DropdownMenuItem key={card.to} asChild>
                                                <a href={card.to} className="flex items-center gap-2 w-full">
                                                    <card.icon className={`h-4 w-4 ${card.color}`} />
                                                    <span>{card.title}</span>
                                                </a>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            }
                        >
                            <TabsContent value="pers-particulars">
                                <Card className="shadow-lg rounded-xl border border-border p-6">
                                    <CardHeader>
                                        <CardTitle className="text-xl font-semibold text-primary">
                                            Personal Particulars
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent>
                                        <Tabs defaultValue="form">
                                            <TabsList className="mb-6">
                                                <TabsTrigger value="form">Fill Form</TabsTrigger>
                                                <TabsTrigger value="view">View Data</TabsTrigger>
                                            </TabsList>

                                            {/* FORM TAB */}
                                            <TabsContent value="form">
                                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                                                    {/* SECTION A */}
                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle>Personal Information</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {[
                                                                "no",
                                                                "name",
                                                                "course",
                                                                "date of arrvl",
                                                                "idenMarks",
                                                                "pi",
                                                                "dob",
                                                                "pob",
                                                                "domicile",
                                                                "religion",
                                                                "nationality",
                                                                "bloodGp",
                                                                "idenMarks2",
                                                            ].map((name) => (
                                                                <div key={name}>
                                                                    <label className="text-sm font-medium capitalize">{name}</label>
                                                                    <Input
                                                                        {...register(name)}
                                                                        type={name === "dob" || name === "date of arrvl" ? "date" : "text"}
                                                                        placeholder={`Enter ${name}`}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </CardContent>
                                                    </Card>

                                                    {/* SECTION B */}
                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle>Family Details</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {[
                                                                "fatherName",
                                                                "fatherMobile",
                                                                "fatherAddressPermt",
                                                                "fatherAddressPresent",
                                                                "fatherProfession",
                                                                "guardianName",
                                                                "guardianAddress",
                                                                "income",
                                                                "nokDetails",
                                                                "nokAddressPermanent",
                                                                "nokAddressPresent",
                                                                "nearestRlyStn",
                                                                "familySecunderabad",
                                                                "armedForcesRelative",
                                                                "govtAssistance",
                                                            ].map((name) => (
                                                                <div key={name}>
                                                                    <label className="text-sm font-medium capitalize">{name}</label>
                                                                    <Input {...register(name)} placeholder={`Enter ${name}`} />
                                                                </div>
                                                            ))}
                                                        </CardContent>
                                                    </Card>

                                                    {/* SECTION C */}
                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle>Contact & IDs</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {[
                                                                "mobile",
                                                                "email",
                                                                "passport",
                                                                "pan",
                                                                "aadhaar",
                                                                "bank",
                                                                "idCard",
                                                                "upsc",
                                                                "ssb",
                                                            ].map((name) => (
                                                                <div key={name}>
                                                                    <label className="text-sm font-medium capitalize">{name}</label>
                                                                    <Input {...register(name)} placeholder={`Enter ${name}`} />
                                                                </div>
                                                            ))}
                                                        </CardContent>
                                                    </Card>

                                                    {/* SECTION D */}
                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle>Other Information</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {["games", "hobbies", "swimmer", "languages"].map((name) => (
                                                                <div key={name} className="flex items-center gap-2">
                                                                    <label className="text-sm font-medium capitalize w-32">
                                                                        {name}
                                                                    </label>

                                                                    {name === "swimmer" ? (
                                                                        <input
                                                                            type="checkbox"
                                                                            {...register("swimmer")}
                                                                            className="h-4 w-4 accent-primary"
                                                                        />
                                                                    ) : (
                                                                        <Input {...register(name)} placeholder={`Enter ${name}`} />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </CardContent>
                                                    </Card>


                                                    {/* SECTION E */}
                                                    <Card className="border-none">
                                                        <CardHeader>
                                                            <CardTitle>DS Details (to be filled in last term)</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="space-y-4">
                                                            {["PI Cdr", "Dy Cdr", "Cdr"].map((role) => (
                                                                <div key={role} className="border p-4 rounded-lg space-y-2">
                                                                    <h3 className="font-semibold">{role}</h3>
                                                                    {[
                                                                        role === "PI Cdr" ? "SS/IC No" : "IC No",
                                                                        "Rank",
                                                                        "Name",
                                                                        "Unit/Arm",
                                                                        "Mobile No",
                                                                    ].map((field) => {
                                                                        const name = `${role}-${field.toLowerCase().replace(" ", "-")}`;
                                                                        return (
                                                                            <div key={name}>
                                                                                <label className="text-sm font-medium">{field}</label>
                                                                                <Input
                                                                                    {...register(name)}
                                                                                    placeholder={`Enter ${field}`}
                                                                                />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ))}
                                                        </CardContent>
                                                    </Card>

                                                    <div className="flex justify-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            className="w-[200px]"
                                                            type="button"
                                                            onClick={() => reset()}
                                                        >
                                                            Reset
                                                        </Button>
                                                        <Button type="submit" className="w-[200px]">
                                                            Save
                                                        </Button>
                                                    </div>
                                                </form>
                                            </TabsContent>

                                            {/* VIEW TAB */}
                                            <TabsContent value="view">
                                                <Card className="p-6 border rounded-lg bg-gray-50">
                                                    <h3 className="text-lg font-semibold mb-4">Saved Data</h3>
                                                    {savedData ? (
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            {Object.entries(savedData).map(([key, value]) => (
                                                                <p key={key}>
                                                                    <strong>{key}:</strong>{" "}
                                                                    {typeof value === "boolean"
                                                                        ? value ? "Yes" : "No"
                                                                        : value || "-"}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-500 italic">No data found for this cadet.</p>
                                                    )}
                                                </Card>
                                            </TabsContent>

                                        </Tabs>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="mil-trg">
                                <div className="text-center py-12">
                                    <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-semibold text-foreground mb-2">
                                        Military Training Section
                                    </h3>
                                    <p className="text-muted-foreground">Select a module to continue.</p>
                                </div>
                            </TabsContent>
                        </DossierTab>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
