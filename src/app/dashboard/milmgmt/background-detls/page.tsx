"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Shield, ChevronDown } from "lucide-react";
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

interface FamilyMember {
    name: string;
    relation: string;
    age: string;
    occupation: string;
    education: string;
    mobile: string;
}

interface Qualification {
    qualification: string;
    school: string;
    subs: string;
    board: string;
    marks: string;
    grade: string;
}

interface Achievement {
    event: string;
    year: string;
    level: string;
    prize: string;
}

interface AutoBio {
    general: string;
    proficiency: string;
    work: string;
    additional: string;
    date: string;
    sign_oc: string;
    sign_pi: string;
}

export default function BackgroundDetlsPage() {
    const router = useRouter();
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);

    const handleLogout = () => {
        router.push("/login");
    };

    // FAMILY BACKGROUND
    const familyForm = useForm<{ family: FamilyMember[] }>({
        defaultValues: {
            family: [{ name: "", relation: "", age: "", occupation: "", education: "", mobile: "" }],
        },
    });
    const { fields: familyFields, append: addFamily, remove: removeFamily } = useFieldArray({
        control: familyForm.control,
        name: "family",
    });
    const { handleSubmit: handleFamilySubmit } = familyForm;

    const submitFamily = (data: any) => {
        console.log("Family Background Submitted:", data);
        alert("Family background saved successfully!");
    };

    // EDUCATIONAL QUALIFICATIONS
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

    const submitQualifications = (data: any) => {
        console.log("Educational Qualifications Submitted:", data);
        alert("Educational qualifications saved successfully!");
    };

    // ACHIEVEMENTS
    const achievementForm = useForm<{ achievements: Achievement[] }>({
        defaultValues: { achievements: [{ event: "", year: "", level: "", prize: "" }] },
    });
    const { fields: achFields, append: addAch, remove: removeAch } = useFieldArray({
        control: achievementForm.control,
        name: "achievements",
    });
    const { handleSubmit: handleAchSubmit } = achievementForm;

    const submitAchievements = (data: any) => {
        console.log("Achievements Submitted:", data);
        alert("Achievements saved successfully!");
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

    const submitAutoBio = (data: AutoBio) => {
        console.log("Autobiography Submitted:", data);
        alert("Autobiography saved successfully!");
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
