// app/dashboard/genmgmt/pt-mgmt/page.tsx
"use client";

import { useState } from "react";
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
    PTAttemptCreate,
    PTAttemptUpdate,
    PTGradeCreate,
    PTGradeUpdate,
    PTTaskCreate,
    PTTaskUpdate,
    PTTaskScoreCreate,
    PTTaskScoreUpdate,
    PTTypeCreate,
    PTTypeUpdate,
    PTMotivationFieldCreate,
    PTMotivationFieldUpdate,
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
import PTTypesTab from "@/components/pt-mgmt/Pttypestab";
import { usePhysicalTrainingMgmt } from "@/hooks/usePhysicalTrainingMgmt";

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

    // ---------------------------------------------------------------------------
    // Selection state — this is the only local state the page needs.
    // Changing any of these causes React Query to enable/disable the right queries.
    // ---------------------------------------------------------------------------
    const [selectedSemester, setSelectedSemester] = useState(1);
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    const {
        loading,
        template,
        types,
        motivationFields,
        attempts,
        tasks,
        grades,
        taskScores,
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
        addMotivationField,
        editMotivationField,
        removeMotivationField,
    } = usePhysicalTrainingMgmt({
        semester: selectedSemester,
        typeId: selectedTypeId,
        attemptId: selectedAttemptId,
        taskId: selectedTaskId,
    });

    // ---------------------------------------------------------------------------
    // Semester change resets every downstream selection so the stale nested
    // queries are disabled immediately (no wasted network round-trips).
    // ---------------------------------------------------------------------------
    const handleSemesterChange = (value: string) => {
        setSelectedSemester(Number(value));
        setSelectedTypeId(null);
        setSelectedAttemptId(null);
        setSelectedTaskId(null);
    };

    // ---------------------------------------------------------------------------
    // Type handlers
    // ---------------------------------------------------------------------------
    const handleAddType = async (data: PTTypeCreate) => {
        try {
            await addType(data);
            return true;
        } catch {
            return false;
        }
    };

    const handleEditType = async (id: string, data: PTTypeUpdate) => {
        try {
            await editType(id, data);
            return true;
        } catch {
            return false;
        }
    };

    const handleDeleteType = async (id: string) => {
        try {
            await removeType(id, { hard: true });
            return true;
        } catch {
            return false;
        }
    };

    // ---------------------------------------------------------------------------
    // Attempt handlers
    // ---------------------------------------------------------------------------
    const handleAddAttempt = async (tid: string, data: PTAttemptCreate) => {
        try {
            await addAttempt(tid, data);
            return true;
        } catch {
            return false;
        }
    };

    const handleEditAttempt = async (tid: string, attemptId: string, data: PTAttemptUpdate) => {
        try {
            await editAttempt(tid, attemptId, data);
            return true;
        } catch {
            return false;
        }
    };

    const handleDeleteAttempt = async (tid: string, attemptId: string) => {
        try {
            await removeAttempt(tid, attemptId, { hard: true });
            return true;
        } catch {
            return false;
        }
    };

    // ---------------------------------------------------------------------------
    // Grade handlers
    // ---------------------------------------------------------------------------
    const handleAddGrade = async (tid: string, aid: string, data: PTGradeCreate) => {
        try {
            await addGrade(tid, aid, data);
            return true;
        } catch {
            return false;
        }
    };

    const handleEditGrade = async (tid: string, aid: string, gradeId: string, data: PTGradeUpdate) => {
        try {
            await editGrade(tid, aid, gradeId, data);
            return true;
        } catch {
            return false;
        }
    };

    const handleDeleteGrade = async (tid: string, aid: string, gradeId: string) => {
        try {
            await removeGrade(tid, aid, gradeId, { hard: true });
            return true;
        } catch {
            return false;
        }
    };

    // ---------------------------------------------------------------------------
    // Task handlers
    // ---------------------------------------------------------------------------
    const handleAddTask = async (tid: string, data: PTTaskCreate) => {
        try {
            await addTask(tid, data);
            return true;
        } catch {
            return false;
        }
    };

    const handleEditTask = async (tid: string, taskId: string, data: PTTaskUpdate) => {
        try {
            await editTask(tid, taskId, data);
            return true;
        } catch {
            return false;
        }
    };

    const handleDeleteTask = async (tid: string, taskId: string) => {
        try {
            await removeTask(tid, taskId, { hard: true });
            return true;
        } catch {
            return false;
        }
    };

    // ---------------------------------------------------------------------------
    // Task score handlers
    // ---------------------------------------------------------------------------
    const handleAddTaskScore = async (tid: string, tskId: string, data: PTTaskScoreCreate) => {
        try {
            await addTaskScore(tid, tskId, data);
            return true;
        } catch {
            return false;
        }
    };

    const handleEditTaskScore = async (tid: string, tskId: string, scoreId: string, data: PTTaskScoreUpdate) => {
        try {
            await editTaskScore(tid, tskId, scoreId, data);
            return true;
        } catch {
            return false;
        }
    };

    const handleDeleteTaskScore = async (tid: string, tskId: string, scoreId: string) => {
        try {
            await removeTaskScore(tid, tskId, scoreId);
            return true;
        } catch {
            return false;
        }
    };

    // ---------------------------------------------------------------------------
    // Motivation field handlers
    // ---------------------------------------------------------------------------
    const handleAddField = async (data: PTMotivationFieldCreate) => {
        try {
            await addMotivationField(data);
            return true;
        } catch {
            return false;
        }
    };

    const handleEditField = async (id: string, data: PTMotivationFieldUpdate) => {
        try {
            await editMotivationField(id, data);
            return true;
        } catch {
            return false;
        }
    };

    const handleDeleteField = async (id: string) => {
        try {
            await removeMotivationField(id, { hard: true });
            return true;
        } catch {
            return false;
        }
    };

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
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
                                { label: "Module Mgmt", href: "/dashboard/genmgmt?tab=module-mgmt" },
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
                                    onManageGrades={(attempt: PTAttempt) => setSelectedAttemptId(attempt.id)}
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
                                    onManageScores={(task: PTTask) => setSelectedTaskId(task.id)}
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
