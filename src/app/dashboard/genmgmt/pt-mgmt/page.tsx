"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { TabsContent } from "@/components/ui/tabs";
import { List, Settings, Trophy, Target, Award, CheckSquare, Grid } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
    PTAttempt,
    PTTask,
    PTGrade,
    listPTAttempts,
    listPTGrades,
    listPTTasks,
    listPTTaskScores,
} from "@/app/lib/api/Physicaltrainingapi";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import PTTemplateView from "@/components/pt-mgmt/Pttemplateview";
import PTAttemptsTab from "@/components/pt-mgmt/Ptattemptstab";
import PTGradesTab from "@/components/pt-mgmt/Ptgradestab";
import PTTasksTab from "@/components/pt-mgmt/Pttaskstab";
import PTScoresTab from "@/components/pt-mgmt/Ptscorestab";
import PTMotivationTab from "@/components/pt-mgmt/Ptmotivationtab";
import { usePhysicalTrainingMgmt } from "@/hooks/usePhysicalTrainingMgmt";
import PTTypesTab from "@/components/pt-mgmt/Pttypestab";

const ptTabs = [
    { value: "template", title: "Template View", icon: List },
    { value: "types", title: "PT Types", icon: Settings },
    { value: "attempts", title: "Attempts", icon: Target },
    { value: "grades", title: "Grades", icon: Award },
    { value: "tasks", title: "Tasks", icon: CheckSquare },
    { value: "scores", title: "Score Matrix", icon: Grid },
    { value: "motivation", title: "Motivation Awards", icon: Trophy },
];

export default function PhysicalTrainingPage() {
    const router = useRouter();
    const [selectedSemester, setSelectedSemester] = useState(1);
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    // Data states
    const [attempts, setAttempts] = useState<PTAttempt[]>([]);
    const [grades, setGrades] = useState<PTGrade[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [taskScores, setTaskScores] = useState<any[]>([]);

    const {
        loading,
        template,
        types,
        motivationFields,
        fetchTemplate,
        fetchTypes,
        addType,
        editType,
        removeType,
        addAttempt,
        editAttempt,
        removeAttempt,
        addGrade,
        editGrade,
        removeGrade,
        addTask,
        editTask,
        removeTask,
        addTaskScore,
        editTaskScore,
        removeTaskScore,
        fetchMotivationFields,
        addMotivationField,
        editMotivationField,
        removeMotivationField,
    } = usePhysicalTrainingMgmt();

    useEffect(() => {
        fetchTemplate(selectedSemester);
        fetchTypes(selectedSemester);
        fetchMotivationFields(selectedSemester);
    }, [selectedSemester]);

    useEffect(() => {
        if (selectedTypeId) {
            fetchAttemptsList(selectedTypeId);
            fetchTasksList(selectedTypeId);
            fetchAllGradesForType(selectedTypeId);
        } else {
            setAttempts([]);
            setTasks([]);
            setGrades([]);
            setSelectedAttemptId(null);
            setSelectedTaskId(null);
        }
    }, [selectedTypeId]);

    // This useEffect is for the Grades tab when a specific attempt is selected
    useEffect(() => {
        if (selectedTypeId && selectedAttemptId) {
            fetchGradesList(selectedTypeId, selectedAttemptId);
        }
    }, [selectedTypeId, selectedAttemptId]);

    useEffect(() => {
        if (selectedTypeId && selectedTaskId) {
            fetchTaskScoresList(selectedTypeId, selectedTaskId);
        } else {
            setTaskScores([]);
        }
    }, [selectedTypeId, selectedTaskId]);

    const fetchAttemptsList = async (typeId: string) => {
        try {
            const data = await listPTAttempts(typeId);
            setAttempts(data.items || []);
        } catch (error) {
            console.error("Error fetching attempts:", error);
            setAttempts([]);
        }
    };

    const fetchGradesList = async (typeId: string, attemptId: string) => {
        try {
            const data = await listPTGrades(typeId, attemptId);
            setGrades(data.items || []);
        } catch (error) {
            console.error("Error fetching grades:", error);
            setGrades([]);
        }
    };

    // NEW: Fetch all grades for all attempts of a type
    const fetchAllGradesForType = async (typeId: string) => {
        try {
            const attemptsData = await listPTAttempts(typeId);
            const attemptsList = attemptsData.items || [];

            const allGrades: PTGrade[] = [];
            for (const attempt of attemptsList) {
                try {
                    const gradesData = await listPTGrades(typeId, attempt.id);
                    allGrades.push(...(gradesData.items || []));
                } catch (error) {
                    console.error(`Error fetching grades for attempt ${attempt.id}:`, error);
                }
            }

            setGrades(allGrades);
            return allGrades;
        } catch (error) {
            console.error("Error fetching all grades:", error);
            setGrades([]);
            return [];
        }
    };

    const fetchTasksList = async (typeId: string) => {
        try {
            const data = await listPTTasks(typeId);
            setTasks(data.items || []);
        } catch (error) {
            console.error("Error fetching tasks:", error);
            setTasks([]);
        }
    };

    const fetchTaskScoresList = async (typeId: string, taskId: string) => {
        try {
            const data = await listPTTaskScores(typeId, taskId);
            setTaskScores(data.items || []);
        } catch (error) {
            console.error("Error fetching task scores:", error);
            setTaskScores([]);
        }
    };

    const refreshData = async () => {
        await Promise.all([
            fetchTemplate(selectedSemester),
            fetchTypes(selectedSemester),
            fetchMotivationFields(selectedSemester)
        ]);
        if (selectedTypeId) {
            await fetchAttemptsList(selectedTypeId);
            await fetchTasksList(selectedTypeId);
            await fetchAllGradesForType(selectedTypeId);
        }
        if (selectedTypeId && selectedAttemptId) {
            await fetchGradesList(selectedTypeId, selectedAttemptId);
        }
        if (selectedTypeId && selectedTaskId) {
            await fetchTaskScoresList(selectedTypeId, selectedTaskId);
        }
    };

    const handleSemesterChange = (semester: string) => {
        setSelectedSemester(Number(semester));
        setSelectedTypeId(null);
        setSelectedAttemptId(null);
        setSelectedTaskId(null);
    };

    // Type handlers
    const handleAddType = async (data: any) => {
        const result = await addType(data);
        if (result) await refreshData();
        return !!result;
    };

    const handleEditType = async (id: string, data: any) => {
        const result = await editType(id, data);
        if (result) await refreshData();
        return !!result;
    };

    const handleDeleteType = async (id: string) => {
        const result = await removeType(id, { hard: true });
        if (result) await refreshData();
        return result;
    };

    const handleAddAttempt = async (typeId: string, data: any) => {
        const result = await addAttempt(typeId, data);

        await fetchAttemptsList(typeId);

        return !!result;
    };

    const handleEditAttempt = async (typeId: string, attemptId: string, data: any) => {
        const result = await editAttempt(typeId, attemptId, data);

        await fetchAttemptsList(typeId);

        return !!result;
    };

    const handleDeleteAttempt = async (typeId: string, attemptId: string) => {
        const result = await removeAttempt(typeId, attemptId, { hard: true });

        await fetchAttemptsList(typeId);

        return result;
    };

    // Grade handlers
    const handleAddGrade = async (typeId: string, attemptId: string, data: any) => {
        const result = await addGrade(typeId, attemptId, data);
        await refreshData();
        return !!result;
    };

    const handleEditGrade = async (typeId: string, attemptId: string, gradeId: string, data: any) => {
        const result = await editGrade(typeId, attemptId, gradeId, data);
        await refreshData();
        return !!result;
    };

    const handleDeleteGrade = async (typeId: string, attemptId: string, gradeId: string) => {
        const result = await removeGrade(typeId, attemptId, gradeId, { hard: true });
        await refreshData();
        return result;
    };

    // Task handlers
    const handleAddTask = async (typeId: string, data: any) => {
        const result = await addTask(typeId, data);
        await refreshData();
        return !!result;
    };

    const handleEditTask = async (typeId: string, taskId: string, data: any) => {
        const result = await editTask(typeId, taskId, data);
        await refreshData();
        return !!result;
    };

    const handleDeleteTask = async (typeId: string, taskId: string) => {
        const result = await removeTask(typeId, taskId, { hard: true });
        await refreshData();
        return result;
    };

    // Task Score handlers
    const handleAddTaskScore = async (typeId: string, taskId: string, data: any) => {
        const result = await addTaskScore(typeId, taskId, data);
        await refreshData();
        return !!result;
    };

    const handleEditTaskScore = async (typeId: string, taskId: string, scoreId: string, data: any) => {
        const result = await editTaskScore(typeId, taskId, scoreId, data);
        await refreshData();
        return !!result;
    };

    const handleDeleteTaskScore = async (typeId: string, taskId: string, scoreId: string) => {
        const result = await removeTaskScore(typeId, taskId, scoreId);
        await refreshData();
        return result;
    };

    // Motivation Field handlers
    const handleAddField = async (data: any) => {
        const result = await addMotivationField(data);
        await refreshData();
        return true;
    };

    const handleEditField = async (id: string, data: any) => {
        const result = await editMotivationField(id, data);
        await refreshData();
        return true;
    };

    const handleDeleteField = async (id: string) => {
        const result = await removeMotivationField(id, { hard: true });
        await refreshData();
        return true;
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                        <PageHeader
                            title="Physical Training Management"
                            description="Manage PT templates, types, attempts, grades, tasks, and score matrix"
                            onLogout={() => router.push("/login")}
                        />
                    </header>

                    <main className="flex-1 p-6">
                        <BreadcrumbNav
                            paths={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                                { label: "Physical Training" },
                            ]}
                        />

                        <div className="mb-6 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium">Semester:</label>
                                <Select
                                    value={String(selectedSemester)}
                                    onValueChange={handleSemesterChange}
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5, 6].map((sem) => (
                                            <SelectItem key={sem} value={String(sem)}>
                                                Semester {sem}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <GlobalTabs tabs={ptTabs} defaultValue="template">
                            <TabsContent value="template" className="space-y-6">
                                <PTTemplateView
                                    template={template}
                                    loading={loading}
                                    semester={selectedSemester}
                                />
                            </TabsContent>

                            <TabsContent value="types" className="space-y-6">
                                <PTTypesTab
                                    semester={selectedSemester}
                                    types={types}
                                    loading={loading}
                                    onAdd={handleAddType}
                                    onEdit={handleEditType}
                                    onDelete={handleDeleteType}
                                />
                            </TabsContent>

                            <TabsContent value="attempts" className="space-y-6">
                                <PTAttemptsTab
                                    types={types}
                                    attempts={attempts}
                                    selectedTypeId={selectedTypeId}
                                    loading={loading}
                                    onTypeSelect={setSelectedTypeId}
                                    onAdd={handleAddAttempt}
                                    onEdit={handleEditAttempt}
                                    onDelete={handleDeleteAttempt}
                                    onManageGrades={(attempt) => setSelectedAttemptId(attempt.id)}
                                />
                            </TabsContent>

                            <TabsContent value="grades" className="space-y-6">
                                <PTGradesTab
                                    types={types}
                                    selectedTypeId={selectedTypeId}
                                    selectedAttemptId={selectedAttemptId}
                                    attempts={attempts}
                                    grades={grades}
                                    loading={loading}
                                    onTypeSelect={setSelectedTypeId}
                                    onAttemptSelect={setSelectedAttemptId}
                                    onAdd={handleAddGrade}
                                    onEdit={handleEditGrade}
                                    onDelete={handleDeleteGrade}
                                />
                            </TabsContent>

                            <TabsContent value="tasks" className="space-y-6">
                                <PTTasksTab
                                    types={types}
                                    tasks={tasks}
                                    selectedTypeId={selectedTypeId}
                                    loading={loading}
                                    onTypeSelect={setSelectedTypeId}
                                    onAdd={handleAddTask}
                                    onEdit={handleEditTask}
                                    onDelete={handleDeleteTask}
                                    onManageScores={(task) => setSelectedTaskId(task.id)}
                                />
                            </TabsContent>

                            <TabsContent value="scores" className="space-y-6">
                                <PTScoresTab
                                    types={types}
                                    selectedTypeId={selectedTypeId}
                                    selectedTaskId={selectedTaskId}
                                    tasks={tasks}
                                    taskScores={taskScores}
                                    attempts={attempts}
                                    grades={grades}
                                    loading={loading}
                                    onTypeSelect={setSelectedTypeId}
                                    onTaskSelect={setSelectedTaskId}
                                    onAdd={handleAddTaskScore}
                                    onEdit={handleEditTaskScore}
                                    onDelete={handleDeleteTaskScore}
                                />
                            </TabsContent>

                            <TabsContent value="motivation" className="space-y-6">
                                <PTMotivationTab
                                    semester={selectedSemester}
                                    fields={motivationFields}
                                    loading={loading}
                                    onAdd={handleAddField}
                                    onEdit={handleEditField}
                                    onDelete={handleDeleteField}
                                />
                            </TabsContent>
                        </GlobalTabs>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}