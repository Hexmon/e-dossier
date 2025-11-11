"use client";

import { useEffect, useState } from "react";
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
import { toast } from "sonner";
import { MedCatRow, MedicalCategoryForm, MedicalInfoForm, MedInfoRow } from "@/types/med-records";
import { getMedicalInfo, saveMedicalInfo } from "@/app/lib/api/medinfoApi";
import { getMedicalCategory, saveMedicalCategory } from "@/app/lib/api/medCatApi";


export default function MedicalRecordsPage() {
    const router = useRouter();
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);
    const handleLogout = () => router.push("/login");

    const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];
    const [activeTab, setActiveTab] = useState(0);

    const [savedMedInfo, setSavedMedInfo] = useState<MedInfoRow[]>([]);
    const [savedMedCats, setSavedMedCats] = useState<MedCatRow[]>([]);
    const [loading, setLoading] = useState(false);

    // ───────────── Medical Info Form ─────────────
    const medInfoForm = useForm<MedicalInfoForm>({
        defaultValues: {
            medInfo: [
                { date: "", age: "", height: "", ibw: "", abw: "", overw: "", bmi: "", chest: "" },
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

    const onSubmitMedInfo = async (data: MedicalInfoForm) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected!");
            return;
        }

        try {
            const records = data.medInfo.map((r) => ({
                semester: semesters.indexOf(r.term ?? semesters[activeTab]) + 1,
                examDate: (() => {
                    if (!r.date) return null;
                    try {
                        // If it's already a string like "2025-11-10"
                        if (typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
                            return r.date;
                        }
                        // Otherwise, force it to be a date string
                        const d = new Date(r.date);
                        return d.toISOString().split("T")[0];
                    } catch {
                        return null;
                    }
                })(),
                age: Number(r.age),
                heightCm: Number(r.height),
                ibwKg: Number(r.ibw),
                abwKg: Number(r.abw),
                overweightPct: Number(r.overw),
                bmi: Number(r.bmi),
                chestCm: Number(r.chest),
                medicalHistory: data.medicalHistory || "",
                hereditaryIssues: data.medicalIssues || "",
                allergies: data.allergies || "",
            }));

            console.log("records", records)
            const response = await saveMedicalInfo(selectedCadet.ocId, records);
            console.log("response", response)
            if (Array.isArray(response) && response.length > 0) {
                toast.success(`Medical Info for ${semesters[activeTab]} saved!`);
            } else {
                toast.error("Failed to save medical info.");
            }

            const enrichedRows = data.medInfo.map((r) => ({
                ...r,
                term: semesters[activeTab],
            }));
            setSavedMedInfo((prev) => [...prev, ...enrichedRows]);
            resetMedInfo();

        } catch {
            toast.error("Failed to save medical info.");
        }
    };

    const fetchMedicalInfo = async () => {
        if (!selectedCadet?.ocId) return;

        try {
            setLoading(true);
            const data = await getMedicalInfo(selectedCadet.ocId);
            console.log("fetched response data", data)

            const formatted = data.map((item) => ({
                term: semesters[item.semester - 1] || `TERM ${item.semester}`,
                date: item.date?.split("T")[0] || "",
                age: String(item.age ?? ""),
                height: String(item.heightCm ?? ""),
                ibw: String(item.ibwKg ?? ""),
                abw: String(item.abwKg ?? ""),
                overw: String(item.overweightPct ?? ""),
                bmi: String(item.bmi ?? ""),
                chest: String(item.chestCm ?? ""),
            }));

            setSavedMedInfo(formatted);
            console.log("Fetched medical info:", formatted);
        } catch (err) {
            console.error("Failed to fetch medical info:", err);
            toast.error("Failed to load medical info.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMedicalInfo();
    }, [selectedCadet]);

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

    const onSubmitMedCat = async (data: MedicalCategoryForm) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected!");
            return;
        }

        try {
            const records = data.records.map((r) => ({
                semester: activeTab + 1,
                date:
                    typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date)
                        ? r.date
                        : new Date(r.date).toISOString().split("T")[0],
                mosAndDiagnostics: r.diagnosis || "",
                categoryFrom: r.catFrom || null,
                categoryTo: r.catTo || null,
                mhAdmissionFrom: r.mhFrom || null,
                mhAdmissionTo: r.mhTo || null,
                absence: r.absence || null,
                platoonCommanderName: r.piCdrInitial || null,
            }));

            const response = await saveMedicalCategory(selectedCadet.ocId, records);

            if (Array.isArray(response) && response.length > 0) {
                toast.success(`MED CAT record saved for ${semesters[activeTab]}!`);
                const enrichedRecords = data.records.map((r) => ({
                    term: semesters[activeTab],
                    date: r.date,
                    diagnosis: r.diagnosis || "",
                    catFrom: r.catFrom || "",
                    catTo: r.catTo || "",
                    mhFrom: r.mhFrom || "",
                    mhTo: r.mhTo || "",
                    absence: r.absence || "",
                    piCdrInitial: r.piCdrInitial || "",
                }));

                setSavedMedCats((prev) => [...prev, ...enrichedRecords]);
            } else {
                toast.error("Failed to save MED CAT record.");
            }

            resetMedCat();
        } catch (error) {
            console.error(" MED CAT save error:", error);
            toast.error("Failed to save MED CAT record.");
        }
    };

    const fetchMedicalCategory = async () => {
        if (!selectedCadet?.ocId) return;

        try {
            setLoading(true);
            const data = await getMedicalCategory(selectedCadet.ocId);
            console.log("Fetched MED CAT data:", data);

            const formatted = data.map((item) => ({
                term: semesters[item.semester - 1] || `TERM ${item.semester}`,
                date: item.date?.split("T")[0] || "",
                diagnosis: item.mosAndDiagnostics || "",
                catFrom: item.catFrom?.split("T")[0] || "",
                catTo: item.catTo?.split("T")[0] || "",
                mhFrom: item.mhFrom?.split("T")[0] || "",
                mhTo: item.mhTo?.split("T")[0] || "",
                absence: item.absence || "",
                piCdrInitial: item.platoonCommanderName || "",
            }));

            setSavedMedCats(formatted);
        } catch (err) {
            console.error("Failed to fetch MED CAT records:", err);
            toast.error("Failed to load MED CAT records.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {

        fetchMedicalCategory();
    }, [selectedCadet]);




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
                                                {/* TERM SELECTOR */}
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

                                                {/* VIEW TABLE */}
                                                {loading ? (
                                                    <p className="text-center text-gray-500">Loading saved records...</p>
                                                ) : (
                                                    (() => {
                                                        const filtered = savedMedInfo.filter((row) => row.term === semesters[activeTab]);
                                                        if (filtered.length === 0) {
                                                            return (
                                                                <p className="text-center mb-4 text-gray-500">
                                                                    No medical info saved yet for {semesters[activeTab]}.
                                                                </p>
                                                            );
                                                        }
                                                        return (
                                                            <div className="overflow-x-auto mb-6 border rounded-lg shadow">
                                                                <table className="w-full border text-sm">
                                                                    <thead className="bg-gray-100">
                                                                        <tr>
                                                                            {[
                                                                                "Date",
                                                                                "Age",
                                                                                "Height (cm)",
                                                                                "IBW (Kg)",
                                                                                "ABW (Kg)",
                                                                                "Overwt (%)",
                                                                                "BMI",
                                                                                "Chest (cm)",
                                                                            ].map((h) => (
                                                                                <th key={h} className="border p-2 text-center">
                                                                                    {h}
                                                                                </th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {filtered.map((row, idx) => (
                                                                            <tr key={idx}>
                                                                                <td className="border p-2 text-center">{row.date}</td>
                                                                                <td className="border p-2 text-center">{row.age}</td>
                                                                                <td className="border p-2 text-center">{row.height}</td>
                                                                                <td className="border p-2 text-center">{row.ibw}</td>
                                                                                <td className="border p-2 text-center">{row.abw}</td>
                                                                                <td className="border p-2 text-center">{row.overw}</td>
                                                                                <td className="border p-2 text-center">{row.bmi}</td>
                                                                                <td className="border p-2 text-center">{row.chest}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        );
                                                    })()
                                                )}

                                                {/* FORM */}
                                                <form
                                                    onSubmit={handleSubmitMedInfo(onSubmitMedInfo)}
                                                >
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full border text-sm">
                                                            <thead className="bg-gray-100">
                                                                <tr>
                                                                    {[
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
                                                                            .filter((f) => f !== "id" && f !== "term")
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
                                                                    term: semesters[activeTab],
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

                                                {/* VIEW TABLE */}
                                                {loading ? (
                                                    <p className="text-center text-gray-500">Loading saved records...</p>
                                                ) : (
                                                    (() => {
                                                        const filteredCats = savedMedCats.filter((row) => row.term === semesters[activeTab]);
                                                        if (filteredCats.length === 0) {
                                                            return (
                                                                <p className="text-center mb-4 text-gray-500">
                                                                    No MED CAT records saved yet for {semesters[activeTab]}.
                                                                </p>
                                                            );
                                                        }
                                                        return (
                                                            <div className="overflow-x-auto mb-6 border rounded-lg shadow">
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
                                                                            ].map((h) => (
                                                                                <th key={h} className="border p-2 text-center">
                                                                                    {h}
                                                                                </th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {filteredCats.map((row, idx) => (
                                                                            <tr key={idx}>
                                                                                <td className="border p-2 text-center">{row.date}</td>
                                                                                <td className="border p-2 text-center">{row.diagnosis}</td>
                                                                                <td className="border p-2 text-center">{row.catFrom}</td>
                                                                                <td className="border p-2 text-center">{row.catTo}</td>
                                                                                <td className="border p-2 text-center">{row.mhFrom}</td>
                                                                                <td className="border p-2 text-center">{row.mhTo}</td>
                                                                                <td className="border p-2 text-center">{row.absence}</td>
                                                                                <td className="border p-2 text-center">{row.piCdrInitial}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        );
                                                    })()
                                                )}

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
