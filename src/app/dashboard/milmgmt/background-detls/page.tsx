"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Shield, ChevronDown, School } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dossierTabs, militaryTrainingCards } from "@/config/app.config";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { PageHeader } from "@/components/layout/PageHeader";
import DossierTab from "@/components/Tabs/DossierTab";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FamilyMember, getFamilyDetails, saveFamilyDetails } from "@/app/lib/api/familyApi";
import { toast } from "sonner";
import { Achievement, AutoBio, Qualification } from "@/types/background-detls";
import { EducationRecordResponse, getEducationDetails, saveEducationDetails } from "@/app/lib/api/educationApi";
import { getAchievements, saveAchievements } from "@/app/lib/api/achievementsApi";
import { useCallback, useEffect, useState } from "react";
import { getAutobiographyDetails, saveAutobiography } from "@/app/lib/api/autobiographyApi";

export default function BackgroundDetlsPage() {
    const router = useRouter();
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);
    const [savedEducation, setSavedEducation] = useState<Qualification[]>([]);
    const [savedFamily, setSavedFamily] = useState<FamilyMember[]>([]);
    const [savedAchievements, setSavedAchievements] = useState<Achievement[]>([]);

    const handleLogout = () => {
        router.push("/login");
    };

    // FAMILY BACKGROUND
    const fetchFamilyData = useCallback(async () => {
        if (!selectedCadet?.ocId) return;
        try {
            const data = await getFamilyDetails(selectedCadet.ocId);
            if (data.length > 0) {
                setSavedFamily(data);
            }
        } catch (err) {
            toast.error("Error loading family background data.");
        }
    }, [selectedCadet?.ocId]);

    useEffect(() => {
        fetchFamilyData();
    }, [fetchFamilyData]);

    const familyForm = useForm<{ family: FamilyMember[] }>({
        defaultValues: {
            family: [{ name: "", relation: "", age: "", occupation: "", education: "", mobileNo: "" }],
        },
    });
    const { fields: familyFields, append: addFamily, remove: removeFamily } = useFieldArray({
        control: familyForm.control,
        name: "family",
    });
    const { handleSubmit: handleFamilySubmit } = familyForm;

    const submitFamily = async (data: { family: FamilyMember[] }) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        try {
            const responses = await saveFamilyDetails(selectedCadet.ocId, data.family);

            const allSucceeded =
                responses.length > 0

            if (allSucceeded) {
                setSavedFamily((prev) => [...prev, ...data.family]);
                toast.success("Family details saved successfully!");
            } else {
                toast.warning("Some or all family members failed to save.");
            }
        } catch (error) {
            console.error("Unexpected error saving family details:", error);
            toast.error("Unexpected error while saving family details.");
        }
    };

    // EDUCATIONAL QUALIFICATIONS
    const fetchEducationData = useCallback(async () => {
        if (!selectedCadet?.ocId) return;
        try {
            const data = await getEducationDetails(selectedCadet.ocId) as EducationRecordResponse[];
            console.log("Education data:", data);

            if (Array.isArray(data) && data.length > 0) {
                const formatted = data.map((item) => ({
                    qualification: item.level || "",
                    school: item.schoolOrCollege || "",
                    subs: item.subjects || "",
                    board: item.boardOrUniv || "",
                    marks: item.totalPercent ? item.totalPercent.toString() : "",
                    grade: "",
                }));
                setSavedEducation(formatted);
            }
        } catch (err) {
            console.error("Error loading educational details:", err);
            toast.error("Error loading educational details.");
        }
    }, [selectedCadet?.ocId]);

    useEffect(() => {
        fetchEducationData();
    }, [fetchEducationData]);

    const qualificationForm = useForm<{ qualifications: Qualification[] }>({
        defaultValues: {
            qualifications: [{ qualification: "", school: "", subs: "", board: "", marks: "", grade: "" }],
        },
    });
    const { fields: qualFields, append: addQual, remove: removeQual } = useFieldArray({
        control: qualificationForm.control,
        name: "qualifications",
    });
    const { handleSubmit: handleQualSubmit } = qualificationForm;

    const submitQualifications = async (data: { qualifications: Qualification[] }) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }
        try {
            const payload = data.qualifications.map((q) => ({
                level: q.qualification,
                school: q.school,
                board: q.board,
                subjects: q.subs,
                percentage: q.marks ? Number(q.marks) : 0,
            }));
            const responses = await saveEducationDetails(selectedCadet.ocId, payload);

            const allSucceeded =
                responses.length > 0

            if (allSucceeded) {
                setSavedEducation((prev) => [...prev, ...data.qualifications]);
                toast.success("Educational qualifications saved successfully!");
            } else {
                toast.warning("Some qualifications failed to save. Please check and retry.");
            }
        } catch (err) {
            console.error("Error saving educational qualifications:", err);
            toast.error("Error saving educational qualifications.");
        }
    };

    // ACHIEVEMENTS
    const fetchAchievements = useCallback(async () => {
        if (!selectedCadet?.ocId) return;
        try {
            const data = await getAchievements(selectedCadet.ocId);
            console.log("Achievements data:", data);

            if (Array.isArray(data) && data.length > 0) {
                setSavedAchievements(data);
            }
        } catch (err) {
            console.error("Error loading achievements:", err);
            toast.error("Error loading achievements data.");
        }
    }, [selectedCadet?.ocId]);

    useEffect(() => {
        fetchAchievements();
    }, [fetchAchievements]);

    const achievementForm = useForm<{ achievements: Achievement[] }>({
        defaultValues: { achievements: [{ event: "", year: 0, level: "", prize: "" }] },
    });
    const { fields: achFields, append: addAch, remove: removeAch } = useFieldArray({
        control: achievementForm.control,
        name: "achievements",
    });
    const { handleSubmit: handleAchSubmit } = achievementForm;

    const submitAchievements = async (data: { achievements: Achievement[] }) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected")
            return;
        }
        try {
            const payload = data.achievements.map((a) => ({
                event: a.event,
                year: a.year,
                level: a.level,
                prize: a.prize,
            }));
            const responses = await saveAchievements(selectedCadet.ocId, payload);

            const allSucceeded =
                responses.length > 0

            if (allSucceeded) {
                setSavedAchievements((prev) => [...prev, ...data.achievements]);
                toast.success("Achievements saved successfully!");
            } else {
                toast.warning("Some achievements failed to save. Please check and retry.");
            }
        } catch (err) {
            console.error("Error saving achievements:", err);
            toast.error("Error saving achievements.");
        }
    };

    // AUTOBIOGRAPHY
    const autoBioForm = useForm<AutoBio>({
        defaultValues: {
            general: "",
            proficiency: "",
            work: "",
            additional: "",
            date: "",
            sign_oc: "",
            sign_pi: "",
        },
    });
    const { register: autoBioRegister, handleSubmit: handleAutoBioSubmit, reset: resetAutoBio, watch: watchAutoBio } = autoBioForm;
    const savedAutoBio = watchAutoBio();
    const fetchAutobiography = useCallback(async () => {
        if (!selectedCadet?.ocId) return;

        try {
            const data = await getAutobiographyDetails(selectedCadet.ocId);
            console.log("auto bio data", data)
            if (data) {
                resetAutoBio(data);
            } else {
                console.log("No autobiography data found.");
            }
        } catch (err) {
            console.error("Error loading autobiography data:", err);
            toast.error("Error loading autobiography details.");
        }
    }, [selectedCadet?.ocId, resetAutoBio]);

    useEffect(() => {
        fetchAutobiography();
    }, [fetchAutobiography]);

    const submitAutoBio = async (data: AutoBio) => {
        if (!selectedCadet?.ocId) {
            toast.error("No cadet selected");
            return;
        }

        try {
            const response = await saveAutobiography(selectedCadet.ocId, data);
            console.log("response", response.ok, response.status);

            if (response?.data && Object.keys(response.data).length > 0) {
                toast.success("Autobiography saved successfully!");
            } else {
                toast.warning("Failed to save autobiography. Please try again.");
            }
        } catch (error) {
            console.error("Error saving autobiography:", error);
            toast.error("An unexpected error occurred while saving autobiography.");
        }
    };


    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                    <PageHeader
                        title="Background Details"
                        description="Maintain and review cadets' background information, including family, education, and prior experiences."
                        onLogout={handleLogout}
                    />

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Dossier", href: "/dashboard/milmgmt" },
                                { label: "Background Details" },
                            ]}
                        />

                        {selectedCadet && <SelectedCadetTable selectedCadet={selectedCadet} />}

                        <DossierTab
                            tabs={dossierTabs}
                            defaultValue="background-detls"
                            extraTabs={
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <TabsTrigger value="background-detls" className="flex items-center gap-2">
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
                                <Tabs defaultValue="family-bgrnd">
                                    <TabsList className="grid grid-cols-4 sticky top-[11.5rem] z-30 w-full mb-2">
                                        <TabsTrigger value="family-bgrnd" className="border border-gray-300 text-blue-700 data-[state=inactive]:bg-blue-100 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2 transition-colors">Family Background</TabsTrigger>
                                        <TabsTrigger value="edn-qlf" className="border border-gray-300 text-blue-700 data-[state=inactive]:bg-blue-100 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2 transition-colors">Educational Qualification</TabsTrigger>
                                        <TabsTrigger value="achievements" className="border border-gray-300 text-blue-700 data-[state=inactive]:bg-blue-100 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2 transition-colors">Achievements</TabsTrigger>
                                        <TabsTrigger value="auto-bio" className="border border-gray-300 text-blue-700 data-[state=inactive]:bg-blue-100 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2 transition-colors">Autobiography</TabsTrigger>
                                    </TabsList>

                                    {/* FAMILY BACKGROUND */}
                                    <TabsContent value="family-bgrnd">
                                        {savedFamily && savedFamily.length > 0 ? (
                                            <div className="overflow-x-auto mb-6 border rounded-lg shadow">
                                                <table className="min-w-full text-sm text-left border border-gray-300">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            {["S.No", "Name", "Relation", "Age", "Occupation", "Edn Qual", "Mobile"].map((head) => (
                                                                <th key={head} className="border px-4 py-2 !bg-gray-300 text-center">
                                                                    {head}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {savedFamily.map((member, idx) => (
                                                            <tr key={idx}>
                                                                <td className="border px-4 py-2 text-center">{idx + 1}</td>
                                                                <td className="border px-4 py-2">{member.name}</td>
                                                                <td className="border px-4 py-2">{member.relation}</td>
                                                                <td className="border px-4 py-2">{member.age}</td>
                                                                <td className="border px-4 py-2">{member.occupation}</td>
                                                                <td className="border px-4 py-2">{member.education}</td>
                                                                <td className="border px-4 py-2">{member.mobileNo}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-center mb-4 text-gray-500">
                                                No family background data saved yet.
                                            </p>
                                        )}

                                        <form onSubmit={handleFamilySubmit(submitFamily)}>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm text-left border border-gray-300">
                                                    <thead className="">
                                                        <tr className="">
                                                            {["S.No", "Name", "Relation", "Age", "Occupation", "Edn Qual", "Mobile", "Action"].map((head) => (
                                                                <th key={head} className="border px-4 py-2 !bg-gray-300">{head}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {familyFields.map((member, idx) => (
                                                            <tr key={member.id}>
                                                                <td className="border px-4 py-2 text-center">{idx + 1}</td>
                                                                {["name", "relation", "age", "occupation", "education", "mobile"].map((field) => (
                                                                    <td key={field} className="border px-4 py-2">
                                                                        <Input {...familyForm.register(`family.${idx}.${field}`)} placeholder={field} />
                                                                    </td>
                                                                ))}
                                                                <td className="border px-4 py-2 text-center">
                                                                    <Button variant="destructive" type="button" onClick={() => removeFamily(idx)}>Remove</Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="mt-4 flex gap-2 justify-center">
                                                <Button type="button" onClick={() => addFamily({ name: "", relation: "", age: "", occupation: "", education: "", mobile: "" })}>
                                                    Add Member
                                                </Button>
                                                <Button type="submit">Save</Button>
                                            </div>
                                        </form>
                                    </TabsContent>

                                    {/* EDUCATIONAL QUALIFICATIONS */}
                                    <TabsContent value="edn-qlf">

                                        <div className="overflow-x-auto mb-6 border rounded-lg shadow">
                                            {savedEducation.length === 0 ? (
                                                <p className="text-center p-4 text-gray-500">
                                                    No educational qualifications saved yet.
                                                </p>
                                            ) : (
                                                <table className="min-w-full text-sm border border-gray-300">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            {["S.No", "Qualification", "School", "Subjects", "Board", "Marks (%)", "Grade"].map((head) => (
                                                                <th key={head} className="border px-4 py-2 !bg-gray-300">{head}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {savedEducation.map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td className="border px-4 py-2 text-center">{idx + 1}</td>
                                                                <td className="border px-4 py-2">{item.qualification}</td>
                                                                <td className="border px-4 py-2">{item.school}</td>
                                                                <td className="border px-4 py-2">{item.subs}</td>
                                                                <td className="border px-4 py-2">{item.board}</td>
                                                                <td className="border px-4 py-2">{item.marks}</td>
                                                                <td className="border px-4 py-2">{item.grade}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>

                                        <form onSubmit={handleQualSubmit(submitQualifications)}>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm text-left border border-gray-300">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            {["S.No", "Qualification", "School", "Subs", "Board", "Marks (%)", "Grade/Div", "Action"].map((head) => (
                                                                <th key={head} className="border px-4 py-2 !bg-gray-300">{head}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {qualFields.map((item, idx) => (
                                                            <tr key={item.id}>
                                                                <td className="border px-4 py-2 text-center">{idx + 1}</td>
                                                                {["qualification", "school", "subs", "board", "marks", "grade"].map((field) => (
                                                                    <td key={field} className="border px-4 py-2">
                                                                        <Input {...qualificationForm.register(`qualifications.${idx}.${field}`)} placeholder={field} />
                                                                    </td>
                                                                ))}
                                                                <td className="border px-4 py-2 text-center">
                                                                    <Button variant="destructive" type="button" onClick={() => removeQual(idx)}>Remove</Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="mt-4 flex gap-2 justify-center">
                                                <Button type="button" onClick={() => addQual({ qualification: "", school: "", subs: "", board: "", marks: "", grade: "" })}>
                                                    Add Qualification
                                                </Button>
                                                <Button type="submit">Save</Button>
                                            </div>
                                        </form>
                                    </TabsContent>

                                    {/* ACHIEVEMENTS */}
                                    <TabsContent value="achievements">

                                        {savedAchievements && savedAchievements.length > 0 ? (
                                            <div className="overflow-x-auto mb-6 border rounded-lg shadow">
                                                <table className="min-w-full text-sm text-left border border-gray-300">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            {["S.No", "Event", "Year", "Level", "Prize"].map((head) => (
                                                                <th key={head} className="border px-4 py-2 !bg-gray-300 text-center">
                                                                    {head}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {savedAchievements.map((ach, idx) => (
                                                            <tr key={idx}>
                                                                <td className="border px-4 py-2 text-center">{idx + 1}</td>
                                                                <td className="border px-4 py-2">{ach.event}</td>
                                                                <td className="border px-4 py-2 text-center">{ach.year}</td>
                                                                <td className="border px-4 py-2">{ach.level}</td>
                                                                <td className="border px-4 py-2">{ach.prize}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-center mb-4 text-gray-500">No achievements saved yet.</p>
                                        )}

                                        <form onSubmit={handleAchSubmit(submitAchievements)}>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm text-left border border-gray-300">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            {["S.No", "Event", "Year", "Level", "Prize", "Action"].map((head) => (
                                                                <th key={head} className="border px-4 py-2 !bg-gray-300">{head}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {achFields.map((item, idx) => (
                                                            <tr key={item.id}>
                                                                <td className="border px-4 py-2 text-center">{idx + 1}</td>
                                                                {["event", "year", "level", "prize"].map((field) => (
                                                                    <td key={field} className="border px-4 py-2">
                                                                        <Input {...achievementForm.register(`achievements.${idx}.${field}`)} placeholder={field} />
                                                                    </td>
                                                                ))}
                                                                <td className="border px-4 py-2 text-center">
                                                                    <Button variant="destructive" type="button" onClick={() => removeAch(idx)}>Remove</Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="mt-4 flex gap-2 justify-center">
                                                <Button type="button" onClick={() => addAch({ event: "", year: "", level: "", prize: "" })}>
                                                    Add Achievement
                                                </Button>
                                                <Button type="submit">Save</Button>
                                            </div>
                                        </form>
                                    </TabsContent>

                                    {/* AUTOBIOGRAPHY */}
                                    <TabsContent value="auto-bio">
                                        <Card className="shadow-lg rounded-2xl border border-border w-full max-w-4xl mx-auto">
                                            <CardHeader>
                                                <CardTitle className="text-xl font-bold text-center uppercase text-primary">
                                                    Confidential - Autobiography Form
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Tabs defaultValue="form">
                                                    <TabsList className="mb-6">
                                                        <TabsTrigger value="form">Fill Form</TabsTrigger>
                                                        <TabsTrigger value="view">View Data</TabsTrigger>
                                                    </TabsList>

                                                    <TabsContent value="form">
                                                        <form onSubmit={handleAutoBioSubmit(submitAutoBio)} className="space-y-6">
                                                            {["general", "proficiency", "work", "additional"].map((field, i) => (
                                                                <div key={field}>
                                                                    <label className="block font-semibold mb-2">
                                                                        {i + 1}. {field.charAt(0).toUpperCase() + field.slice(1)}
                                                                    </label>
                                                                    <Textarea {...autoBioRegister(field)} rows={4} className="w-full" />
                                                                </div>
                                                            ))}

                                                            <div>
                                                                <label className="block font-semibold mb-2">Date</label>
                                                                <Input type="date" {...autoBioRegister("date")} />
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                                <div>
                                                                    <label className="block font-semibold mb-2">Sign of OC</label>
                                                                    <Input {...autoBioRegister("sign_oc")} placeholder="Signature / Name" />
                                                                </div>
                                                                <div>
                                                                    <label className="block font-semibold mb-2">Sign of PI Cdr</label>
                                                                    <Input {...autoBioRegister("sign_pi")} placeholder="Signature / Name" />
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-center gap-2 mt-6">
                                                                <Button variant="outline" type="button" className="w-[200px]" onClick={() => resetAutoBio()}>
                                                                    Reset
                                                                </Button>
                                                                <Button type="submit" className="w-[200px]">
                                                                    Save
                                                                </Button>
                                                            </div>
                                                        </form>
                                                    </TabsContent>

                                                    <TabsContent value="view">
                                                        <div className="p-6 bg-gray-50 border rounded-lg">
                                                            <h3 className="text-lg font-semibold mb-4">Saved Autobiography Data</h3>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                                                {Object.entries(savedAutoBio).map(([key, value]) => (
                                                                    <p key={key}>
                                                                        <strong>{key}:</strong> {value || "-"}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </TabsContent>
                                                </Tabs>
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
