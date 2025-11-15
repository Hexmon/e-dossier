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
import { deleteFamilyMember, FamilyMember, FamilyMemberRecord, getFamilyDetails, saveFamilyDetails, updateFamilyMember } from "@/app/lib/api/familyApi";
import { toast } from "sonner";
import { Achievement, AutoBio, Qualification } from "@/types/background-detls";
import { deleteEducationRecord, EducationItem, EducationRecordResponse, EducationUI, getEducationDetails, saveEducationDetails, updateEducationRecord } from "@/app/lib/api/educationApi";
import { deleteAchievementRecord, getAchievements, saveAchievements, updateAchievementRecord } from "@/app/lib/api/achievementsApi";
import { useCallback, useEffect, useState } from "react";
import { AutoBioPayload, getAutobiographyDetails, saveAutobiography } from "@/app/lib/api/autobiographyApi";

export default function BackgroundDetlsPage() {
    const router = useRouter();
    const selectedCadet = useSelector((state: RootState) => state.cadet.selectedCadet);
    const [savedEducation, setSavedEducation] = useState<EducationItem[]>([]);
    const [savedFamily, setSavedFamily] = useState<FamilyMemberRecord[]>([]);
    const [savedAchievements, setSavedAchievements] = useState<Achievement[]>([]);
    const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<FamilyMemberRecord | null>(null);
    const [editingEduId, setEditingEduId] = useState<string | null>(null);
    const [editEduForm, setEditEduForm] = useState<EducationUI | null>(null);
    const [editingAchId, setEditingAchId] = useState<string | null>(null);
    const [editAchForm, setEditAchForm] = useState<Achievement | null>(null);

    const handleEditAchievement = (row: Achievement) => {
        setEditingAchId(row.id ?? null);
        setEditAchForm({ ...row });
    };

    const handleCancelAchievement = () => {
        setEditingAchId(null);
        setEditAchForm(null);
    };

    const handleChangeAchievement = (field: keyof Achievement, value: any) => {
        setEditAchForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const handleSaveAchievement = async () => {
        if (!selectedCadet?.ocId || !editingAchId || !editAchForm) {
            return toast.error("Invalid operation");
        }

        try {
            await updateAchievementRecord(selectedCadet.ocId, editingAchId, {
                event: editAchForm.event,
                year: editAchForm.year,
                level: editAchForm.level,
                prize: editAchForm.prize,
            });

            setSavedAchievements((prev) =>
                prev.map((a) =>
                    a.id === editingAchId ? { ...editAchForm } : a
                )
            );

            toast.success("Achievement updated!");
            setEditingAchId(null);
            setEditAchForm(null);
        } catch (err) {
            console.error(err);
            toast.error("Failed to update achievement");
        }
    };

    const handleDeleteAchievement = async (row: Achievement) => {
        if (!selectedCadet?.ocId || !row.id)
            return toast.error("Invalid achievement record");

        try {
            await deleteAchievementRecord(selectedCadet.ocId, row.id);

            setSavedAchievements((prev) => prev.filter((x) => x.id !== row.id));
            toast.success("Achievement deleted!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete achievement");
        }
    };

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

    const submitFamily = async (data: { family: FamilyMemberRecord[] }) => {
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
                const formatted: EducationItem[] = data.map((item) => ({
                    id: item.id,
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
                setSavedEducation((prev) =>
                    prev.map((item) =>
                        item.id === editingEduId ? { ...item, ...editEduForm } : item
                    )
                );
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

            const withIds: Achievement[] = data.map(a => ({
                id: crypto.randomUUID(),
                ...a
            }));

            setSavedAchievements(withIds);
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
                setSavedAchievements(prev => [
                    ...prev,
                    ...responses.map((r, i) => ({
                        ...data.achievements[i],
                        id: r.id
                    }))
                ]);


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

            if (data) {
                resetAutoBio({
                    general: data.general ?? "",
                    proficiency: data.sportsProficiency ?? "",
                    work: data.achievementsNote ?? "",
                    additional: data.areasToWork ?? "",
                    date: data.filledOn ?? "",
                    sign_oc: data.platoonCommanderName ?? "",
                    sign_pi: ""
                });
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

        const payload: AutoBioPayload = {
            general: data.general,
            sportsProficiency: data.proficiency,
            achievementsNote: data.work,
            areasToWork: data.additional,
            additionalInfo: data.additional,
            filledOn: typeof data.date === "string"
                ? data.date
                : new Date(data.date).toISOString().split("T")[0],
            platoonCommanderName: data.sign_oc,
        };

        try {
            const response = await saveAutobiography(selectedCadet.ocId, payload);

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

    const handleEditFamily = (member: FamilyMemberRecord) => {
        setEditingId(member.id);
        setEditForm({ ...member });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const handleChangeEdit = (field: keyof FamilyMember, value: string | number) => {
        setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const handleSaveFamily = async () => {
        if (!selectedCadet?.ocId || !editingId || !editForm) {
            toast.error("Invalid operation");
            return;
        }

        try {
            await updateFamilyMember(selectedCadet.ocId, editingId, {
                name: editForm.name,
                relation: editForm.relation,
                age: editForm.age,
                occupation: editForm.occupation,
                education: editForm.education,
                mobileNo: editForm.mobileNo,
            });

            setSavedFamily((prev) => prev.map((f) => (f.id === editingId ? editForm : f)));
            toast.success("Family member updated");
            setEditingId(null);
            setEditForm(null);
        } catch (err) {
            console.error("Failed to update family member:", err);
            toast.error("Failed to update family member");
        }
    };

    const handleDeleteFamily = async (member: FamilyMemberRecord) => {
        if (!selectedCadet?.ocId || !member.id) return toast.error("Invalid family record");

        try {
            await deleteFamilyMember(selectedCadet.ocId, member.id);
            setSavedFamily((prev) => prev.filter((f) => f.id !== member.id));
            toast.success("Family member deleted");
        } catch (err) {
            console.error("Failed to delete family member:", err);
            toast.error("Failed to delete member");
        }
    };

    const handleEditEducation = (row: EducationUI) => {
        setEditingEduId(row.id);
        setEditEduForm({ ...row });
    };

    const handleChangeEducation = (field: keyof EducationUI, value: any) => {
        setEditEduForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const handleSaveEducation = async () => {
        if (!selectedCadet?.ocId || !editingEduId || !editEduForm) {
            return toast.error("Invalid operation");
        }

        try {
            await updateEducationRecord(selectedCadet.ocId, editingEduId, {
                totalPercent:
                    editEduForm.marks !== null &&
                        editEduForm.marks !== undefined &&
                        editEduForm.marks !== ""
                        ? Number(editEduForm.marks)
                        : 0,
            });

            setSavedEducation((prev) =>
                prev.map((item) =>
                    item.id === editingEduId ? { ...editEduForm } : item
                )
            );

            toast.success("Educational record updated!");

            setEditingEduId(null);
            setEditEduForm(null);
        } catch (err) {
            console.error(err);
            toast.error("Failed to update educational record");
        }
    };

    const handleDeleteEducation = async (row: EducationUI) => {
        if (!selectedCadet?.ocId || !row.id) return toast.error("Invalid education record");

        try {
            await deleteEducationRecord(selectedCadet.ocId, row.id);

            setSavedEducation((prev) => prev.filter((x) => x.id !== row.id));

            toast.success("Educational qualification deleted!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete educational record");
        }
    };

    const handleCancelEducation = () => {
        setEditingEduId(null);
        setEditEduForm(null);
    };


    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                    <PageHeader
                        title="Background Details"
                        description="Maintain and review cadets' background information, including family, education, and prior experiences."
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
                                                            {["S.No", "Name", "Relation", "Age", "Occupation", "Edn Qual", "Mobile", "Action"].map((head) => (
                                                                <th key={head} className="border px-4 py-2 !bg-gray-300 text-center">{head}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {savedFamily.map((member: FamilyMemberRecord, idx) => {
                                                            const isEditingRow = editingId === member.id;
                                                            return (
                                                                <tr key={member.id}>
                                                                    <td className="border px-4 py-2 text-center">{idx + 1}</td>

                                                                    {/* Name */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditingRow ? (
                                                                            <Input value={editForm?.name || ""} onChange={(e) => handleChangeEdit("name", e.target.value)} />
                                                                        ) : (
                                                                            member.name
                                                                        )}
                                                                    </td>

                                                                    {/* Relation */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditingRow ? (
                                                                            <Input value={editForm?.relation || ""} onChange={(e) => handleChangeEdit("relation", e.target.value)} />
                                                                        ) : (
                                                                            member.relation
                                                                        )}
                                                                    </td>

                                                                    {/* Age */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditingRow ? (
                                                                            <Input type="number" value={String(editForm?.age ?? "")} onChange={(e) => handleChangeEdit("age", e.target.value ? Number(e.target.value) : "")} />
                                                                        ) : (
                                                                            member.age ?? ""
                                                                        )}
                                                                    </td>

                                                                    {/* Occupation */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditingRow ? (
                                                                            <Input value={editForm?.occupation || ""} onChange={(e) => handleChangeEdit("occupation", e.target.value)} />
                                                                        ) : (
                                                                            member.occupation ?? ""
                                                                        )}
                                                                    </td>

                                                                    {/* Education */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditingRow ? (
                                                                            <Input value={editForm?.education || ""} onChange={(e) => handleChangeEdit("education", e.target.value)} />
                                                                        ) : (
                                                                            member.education ?? ""
                                                                        )}
                                                                    </td>

                                                                    {/* Mobile */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditingRow ? (
                                                                            <Input value={editForm?.mobileNo || ""} onChange={(e) => handleChangeEdit("mobileNo", e.target.value)} />
                                                                        ) : (
                                                                            member.mobileNo ?? ""
                                                                        )}
                                                                    </td>

                                                                    {/* ACTIONS */}
                                                                    <td className="border px-4 py-2 text-center space-x-2">
                                                                        {!isEditingRow ? (
                                                                            <>
                                                                                <Button size="sm" variant="outline" onClick={() => handleEditFamily(member)}>Edit</Button>
                                                                                <Button size="sm" variant="destructive" onClick={() => handleDeleteFamily(member)}>Delete</Button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Button size="sm" onClick={handleSaveFamily}>Save</Button>
                                                                                <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                                                                            </>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-center mb-4 text-gray-500">No family background data saved yet.</p>
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
                                                            {[
                                                                "S.No", "Qualification", "School", "Subjects",
                                                                "Board", "Marks (%)", "Grade", "Action"
                                                            ].map((head) => (
                                                                <th
                                                                    key={head}
                                                                    className="border px-4 py-2 !bg-gray-300 text-center"
                                                                >
                                                                    {head}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {savedEducation.map((row, idx) => {
                                                            const isEditing = editingEduId === row.id;

                                                            return (
                                                                <tr key={row.id}>
                                                                    <td className="border px-4 py-2 text-center">
                                                                        {idx + 1}
                                                                    </td>

                                                                    {/* Qualification */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                value={editEduForm?.qualification || ""}
                                                                                onChange={(e) =>
                                                                                    handleChangeEducation(
                                                                                        "qualification",
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            row.qualification
                                                                        )}
                                                                    </td>

                                                                    {/* School */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                value={editEduForm?.school || ""}
                                                                                onChange={(e) =>
                                                                                    handleChangeEducation(
                                                                                        "school",
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            row.school
                                                                        )}
                                                                    </td>

                                                                    {/* Subjects */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                value={editEduForm?.subs || ""}
                                                                                onChange={(e) =>
                                                                                    handleChangeEducation(
                                                                                        "subs",
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            row.subs
                                                                        )}
                                                                    </td>

                                                                    {/* Board */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                value={editEduForm?.board || ""}
                                                                                onChange={(e) =>
                                                                                    handleChangeEducation(
                                                                                        "board",
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            row.board
                                                                        )}
                                                                    </td>

                                                                    {/* Marks (%) — only editable field used by backend */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                type="number"
                                                                                value={editEduForm?.marks || ""}
                                                                                onChange={(e) =>
                                                                                    handleChangeEducation(
                                                                                        "marks",
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            row.marks
                                                                        )}
                                                                    </td>

                                                                    {/* Grade */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                value={editEduForm?.grade || ""}
                                                                                onChange={(e) =>
                                                                                    handleChangeEducation(
                                                                                        "grade",
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            row.grade
                                                                        )}
                                                                    </td>

                                                                    {/* ACTIONS */}
                                                                    <td className="border px-4 py-2 text-center space-x-2">
                                                                        {!isEditing ? (
                                                                            <>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    onClick={() => handleEditEducation(row)}
                                                                                >
                                                                                    Edit
                                                                                </Button>

                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="destructive"
                                                                                    onClick={() => handleDeleteEducation(row)}
                                                                                >
                                                                                    Delete
                                                                                </Button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Button size="sm" onClick={handleSaveEducation}>
                                                                                    Save
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    onClick={handleCancelEducation}
                                                                                >
                                                                                    Cancel
                                                                                </Button>
                                                                            </>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
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
                                                            {["S.No", "Event", "Year", "Level", "Prize", "Action"].map((head) => (
                                                                <th
                                                                    key={head}
                                                                    className="border px-4 py-2 !bg-gray-300 text-center"
                                                                >
                                                                    {head}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {savedAchievements.map((ach, idx) => {
                                                            const isEditing = editingAchId === ach.id;

                                                            return (
                                                                <tr key={ach.id}>
                                                                    <td className="border px-4 py-2 text-center">{idx + 1}</td>

                                                                    {/* EVENT */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                value={editAchForm?.event || ""}
                                                                                onChange={(e) =>
                                                                                    handleChangeAchievement("event", e.target.value)
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            ach.event
                                                                        )}
                                                                    </td>

                                                                    {/* YEAR */}
                                                                    <td className="border px-4 py-2 text-center">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                type="number"
                                                                                value={editAchForm?.year || ""}
                                                                                onChange={(e) =>
                                                                                    handleChangeAchievement(
                                                                                        "year",
                                                                                        e.target.value ? Number(e.target.value) : ""
                                                                                    )
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            ach.year
                                                                        )}
                                                                    </td>

                                                                    {/* LEVEL */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                value={editAchForm?.level || ""}
                                                                                onChange={(e) =>
                                                                                    handleChangeAchievement("level", e.target.value)
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            ach.level
                                                                        )}
                                                                    </td>

                                                                    {/* PRIZE */}
                                                                    <td className="border px-4 py-2">
                                                                        {isEditing ? (
                                                                            <Input
                                                                                value={editAchForm?.prize || ""}
                                                                                onChange={(e) =>
                                                                                    handleChangeAchievement("prize", e.target.value)
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            ach.prize
                                                                        )}
                                                                    </td>

                                                                    {/* ACTIONS */}
                                                                    <td className="border px-4 py-2 text-center space-x-2">
                                                                        {!isEditing ? (
                                                                            <>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    onClick={() => handleEditAchievement(ach)}
                                                                                >
                                                                                    Edit
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="destructive"
                                                                                    onClick={() => handleDeleteAchievement(ach)}
                                                                                >
                                                                                    Delete
                                                                                </Button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Button size="sm" onClick={handleSaveAchievement}>
                                                                                    Save
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    onClick={handleCancelAchievement}
                                                                                >
                                                                                    Cancel
                                                                                </Button>
                                                                            </>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-center mb-4 text-gray-500">
                                                No achievements saved yet.
                                            </p>
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
