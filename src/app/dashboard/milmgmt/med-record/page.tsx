"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, ChevronDown } from "lucide-react";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { PageHeader } from "@/components/layout/PageHeader";
import DossierTab from "@/components/Tabs/DossierTab";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

// ─────────────────────────────── TYPES ───────────────────────────────

interface MedInfoRow {
    term: string;
    date: string;
    age: string;
    height: string;
    ibw: string;
    abw: string;
    overw: string;
    bmi: string;
    chest: string;
}

interface MedicalInfoForm {
    medInfo: MedInfoRow[];
    medicalHistory: string;
    medicalIssues: string;
    allergies: string;
}

interface MedCatRow {
    date: string;
    diagnosis: string;
    catFrom: string;
    catTo: string;
    mhFrom: string;
    mhTo: string;
    absence: string;
    piCdrInitial: string;
}

interface MedicalCategoryForm {
    records: MedCatRow[];
}

// ─────────────────────────────── COMPONENT ───────────────────────────────

export default function MedicalRecordsPage() {
    const router = useRouter();
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);
    const handleLogout = () => router.push("/login");

    const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];
    const [activeTab, setActiveTab] = useState(0);

    // ───────────── Medical Info Form ─────────────
    const medInfoForm = useForm<MedicalInfoForm>({
        defaultValues: {
            medInfo: [
                { term: "", date: "", age: "", height: "", ibw: "", abw: "", overw: "", bmi: "", chest: "" },
            ],
            medicalHistory: "",
            medicalIssues: "",
            allergies: "",
        },
    });

    const { control: medInfoControl, handleSubmit: handleSubmitMedInfo, register: registerMedInfo, reset: resetMedInfo } =
        medInfoForm;

    const { fields: medInfoFields, append: addMedInfoRow, remove: removeMedInfoRow } = useFieldArray({
        control: medInfoControl,
        name: "medInfo",
    });

    const onSubmitMedInfo = (data: MedicalInfoForm) => {
        console.log(" Medical Info Submitted:", data);
        alert("Medical Information Saved Successfully!");
    };

    // ───────────── Medical Category Form ─────────────
    const medCatForm = useForm<MedicalCategoryForm>({
        defaultValues: {
            records: [
                {
                    date: "",
                    diagnosis: "",
                    catFrom: "",
                    catTo: "",
                    mhFrom: "",
                    mhTo: "",
                    absence: "",
                    piCdrInitial: "",
                },
            ],
        },
    });

    const { control: medCatControl, handleSubmit: handleSubmitMedCat, register: registerMedCat, reset: resetMedCat } =
        medCatForm;

    const { fields: medCatFields, append: addMedCatRow, remove: removeMedCatRow } = useFieldArray({
        control: medCatControl,
        name: "records",
    });

    const onSubmitMedCat = (data: MedicalCategoryForm) => {
        console.log("🧾 Medical Category Submitted:", data);
        alert(" Medical Category Saved Successfully!");
    };

    // ─────────────────────────────── RENDER ───────────────────────────────
    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                    <PageHeader
                        title="Medical Records"
                        description="Maintain and review cadet medical history, document examinations, and ensure accurate health records."
                        onLogout={handleLogout}
                    />

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Dossier", href: "/dashboard/milmgmt" },
                                { label: "Medical Records" },
                            ]}
                        />

                        {selectedCadet && <SelectedCadetTable selectedCadet={selectedCadet} />}

                        <DossierTab
                            tabs={dossierTabs}
                            defaultValue="med-record"
                            extraTabs={
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <TabsTrigger value="med-record" className="flex items-center gap-2">
                                            <Shield className="h-4 w-4" />
                                            Mil-Trg
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
                            nestedTabs={
                                <Tabs defaultValue="med-info">
                                    <TabsList className="grid w-full grid-cols-2 sticky top-[11.5rem] z-30">
                                        <TabsTrigger value="med-info">Medical Info</TabsTrigger>
                                        <TabsTrigger value="med-cat">Medical CAT</TabsTrigger>
                                    </TabsList>

                                    {/* ───────────── MED INFO ───────────── */}
                                    <TabsContent value="med-info">
                                        <Card className="p-6 shadow-lg rounded-xl max-w-6xl mx-auto">
                                            <CardHeader>
                                                <CardTitle className="text-xl font-semibold text-center text-primary">
                                                    Medical Information Form
                                                </CardTitle>
                                            </CardHeader>

                                            <CardContent>
                                                <form onSubmit={handleSubmitMedInfo(onSubmitMedInfo)}>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full border text-sm">
                                                            <thead className="bg-gray-100">
                                                                <tr>
                                                                    {[
                                                                        "Term/Sem",
                                                                        "Date",
                                                                        "Age",
                                                                        "Ht (cm)",
                                                                        "IBW (Kg)",
                                                                        "ABW (Kg)",
                                                                        "Overwt (%)",
                                                                        "BMI",
                                                                        "Chest (cm)",
                                                                        "Action",
                                                                    ].map((h) => (
                                                                        <th key={h} className="border p-2">
                                                                            {h}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {medInfoFields.map((field, index) => (
                                                                    <tr key={field.id}>
                                                                        {Object.keys(field)
                                                                            .filter((f) => f !== "id")
                                                                            .map((f) => (
                                                                                <td className="border p-2" key={f}>
                                                                                    <Input
                                                                                        {...registerMedInfo(`medInfo.${index}.${f}` as const)}
                                                                                        type={f === "date" ? "date" : "text"}
                                                                                    />
                                                                                </td>
                                                                            ))}
                                                                        <td className="border p-2 text-center">
                                                                            <Button
                                                                                type="button"
                                                                                variant="destructive"
                                                                                size="sm"
                                                                                onClick={() => removeMedInfoRow(index)}
                                                                            >
                                                                                Remove
                                                                            </Button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <div className="mt-4 flex justify-center gap-3">
                                                        <Button
                                                            type="button"
                                                            onClick={() =>
                                                                addMedInfoRow({
                                                                    term: "",
                                                                    date: "",
                                                                    age: "",
                                                                    height: "",
                                                                    ibw: "",
                                                                    abw: "",
                                                                    overw: "",
                                                                    bmi: "",
                                                                    chest: "",
                                                                })
                                                            }
                                                        >
                                                            + Add Row
                                                        </Button>

                                                        <Button type="button" variant="outline" onClick={() => resetMedInfo()}>
                                                            Reset
                                                        </Button>
                                                    </div>

                                                    {/* Textareas */}
                                                    <div className="mt-6 space-y-4">
                                                        <Textarea {...registerMedInfo("medicalHistory")} placeholder="Medical History (if any)" rows={3} />
                                                        <Textarea {...registerMedInfo("medicalIssues")} placeholder="Current Medical Issues" rows={3} />
                                                        <Textarea {...registerMedInfo("allergies")} placeholder="Known Allergies" rows={3} />
                                                    </div>
                                                    <div className="flex justify-center items-center">
                                                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 mt-3">
                                                            Submit Medical Info
                                                        </Button>
                                                    </div>
                                                </form>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    {/* ───────────── MED CAT ───────────── */}
                                    <TabsContent value="med-cat">
                                        <Card className="p-6 shadow-lg rounded-xl max-w-6xl mx-auto">
                                            <CardHeader>
                                                <CardTitle className="text-xl font-semibold text-center text-primary">
                                                    MED CAT RECORD
                                                </CardTitle>
                                            </CardHeader>

                                            <CardContent>
                                                <div className="flex justify-center mb-6 space-x-2">
                                                    {semesters.map((sem, idx) => (
                                                        <button
                                                            key={sem}
                                                            type="button"
                                                            onClick={() => setActiveTab(idx)}
                                                            className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === idx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                                                                }`}
                                                        >
                                                            {sem}
                                                        </button>
                                                    ))}
                                                </div>

                                                <form onSubmit={handleSubmitMedCat(onSubmitMedCat)}>
                                                    <div className="overflow-x-auto border rounded-lg shadow">
                                                        <table className="w-full border text-sm">
                                                            <thead className="bg-gray-100">
                                                                <tr>
                                                                    {[
                                                                        "Date",
                                                                        "MO's Diagnosis",
                                                                        "Cat From",
                                                                        "Cat To",
                                                                        "MH From",
                                                                        "MH To",
                                                                        "Absence",
                                                                        "PI Cdr Initial",
                                                                        "Action",
                                                                    ].map((h) => (
                                                                        <th key={h} className="border p-2">
                                                                            {h}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {medCatFields.map((field, index) => (
                                                                    <tr key={field.id}>
                                                                        {Object.keys(field)
                                                                            .filter((f) => f !== "id")
                                                                            .map((f) => (
                                                                                <td className="border p-2" key={f}>
                                                                                    <Input
                                                                                        {...registerMedCat(`records.${index}.${f}` as const)}
                                                                                        type={f === "date" ? "date" : "text"}
                                                                                    />
                                                                                </td>
                                                                            ))}
                                                                        <td className="border p-2 text-center">
                                                                            <Button
                                                                                type="button"
                                                                                variant="destructive"
                                                                                size="sm"
                                                                                onClick={() => removeMedCatRow(index)}
                                                                            >
                                                                                Remove
                                                                            </Button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <div className="mt-4 flex justify-center gap-3">
                                                        <Button
                                                            type="button"
                                                            onClick={() =>
                                                                addMedCatRow({
                                                                    date: "",
                                                                    diagnosis: "",
                                                                    catFrom: "",
                                                                    catTo: "",
                                                                    mhFrom: "",
                                                                    mhTo: "",
                                                                    absence: "",
                                                                    piCdrInitial: "",
                                                                })
                                                            }
                                                        >
                                                            + Add Row
                                                        </Button>
                                                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                                            Submit Medical CAT
                                                        </Button>
                                                        <Button type="button" variant="outline" onClick={() => resetMedCat()}>
                                                            Reset
                                                        </Button>
                                                    </div>

                                                    <p className="text-xs text-gray-600 mt-4 italic">
                                                        * Name of hospital to be indicated in PI Cdr's Initial.
                                                    </p>
                                                </form>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </Tabs>
                            }
                        >
                            <></>
                        </DossierTab>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
