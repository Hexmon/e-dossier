"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { marksWorkflowApi } from "@/app/lib/api/marksWorkflowApi";
import { getAllUsers, type User } from "@/app/lib/api/userApi";
import { useMe } from "@/hooks/useMe";

type ModuleKey = "ACADEMICS_BULK" | "PT_BULK";

type WorkflowModuleDraft = {
    dataEntryUserIds: string[];
    verificationUserIds: string[];
    postVerificationOverrideMode: "SUPER_ADMIN_ONLY" | "ADMIN_AND_SUPER_ADMIN";
};

type WorkflowSettingsDraft = Record<ModuleKey, WorkflowModuleDraft>;

const MODULE_COPY: Record<ModuleKey, { title: string; description: string }> = {
    ACADEMICS_BULK: {
        title: "Academics Bulk Workflow",
        description: "Maker-verifier flow for /dashboard/manage-marks.",
    },
    PT_BULK: {
        title: "PT Bulk Workflow",
        description: "Maker-verifier flow for /dashboard/manage-pt-marks.",
    },
};

function emptyDraft(): WorkflowSettingsDraft {
    return {
        ACADEMICS_BULK: {
            dataEntryUserIds: [],
            verificationUserIds: [],
            postVerificationOverrideMode: "SUPER_ADMIN_ONLY",
        },
        PT_BULK: {
            dataEntryUserIds: [],
            verificationUserIds: [],
            postVerificationOverrideMode: "SUPER_ADMIN_ONLY",
        },
    };
}

function formatUserLabel(user: User) {
    return `${user.rank ?? ""} ${user.name}`.trim() || user.username;
}

function isUserSelectable(user: User) {
    return Boolean(user.id) && !user.deletedAt;
}

export default function MarksReviewWorkflowSettingsPage() {
    const router = useRouter();
    const { data: meData, isLoading: meLoading } = useMe();
    const [draft, setDraft] = useState<WorkflowSettingsDraft>(emptyDraft());
    const [saving, setSaving] = useState(false);
    const [searchByModule, setSearchByModule] = useState<Record<ModuleKey, string>>({
        ACADEMICS_BULK: "",
        PT_BULK: "",
    });

    const settingsQuery = useQuery({
        queryKey: ["marks-review-workflow-settings"],
        queryFn: () => marksWorkflowApi.getSettings(),
    });

    const usersQuery = useQuery({
        queryKey: ["workflow-settings-users"],
        queryFn: () => getAllUsers({ limit: 200, includeDeleted: false }),
    });

    useEffect(() => {
        const roles = (meData?.roles ?? []).map((role) => String(role).toUpperCase());
        if (!meLoading && !roles.includes("ADMIN") && !roles.includes("SUPER_ADMIN")) {
            router.replace("/dashboard");
        }
    }, [meData?.roles, meLoading, router]);

    useEffect(() => {
        if (!settingsQuery.data?.settings) return;
        setDraft({
            ACADEMICS_BULK: {
                dataEntryUserIds: settingsQuery.data.settings.ACADEMICS_BULK.dataEntryUserIds,
                verificationUserIds: settingsQuery.data.settings.ACADEMICS_BULK.verificationUserIds,
                postVerificationOverrideMode:
                    settingsQuery.data.settings.ACADEMICS_BULK.postVerificationOverrideMode,
            },
            PT_BULK: {
                dataEntryUserIds: settingsQuery.data.settings.PT_BULK.dataEntryUserIds,
                verificationUserIds: settingsQuery.data.settings.PT_BULK.verificationUserIds,
                postVerificationOverrideMode: settingsQuery.data.settings.PT_BULK.postVerificationOverrideMode,
            },
        });
    }, [settingsQuery.data]);

    const selectableUsers = useMemo(
        () =>
            (usersQuery.data ?? [])
                .filter(isUserSelectable)
                .sort((left, right) => formatUserLabel(left).localeCompare(formatUserLabel(right))),
        [usersQuery.data],
    );

    const toggleUser = (module: ModuleKey, field: "dataEntryUserIds" | "verificationUserIds", userId: string) => {
        setDraft((prev) => {
            const current = new Set(prev[module][field]);
            if (current.has(userId)) current.delete(userId);
            else current.add(userId);
            return {
                ...prev,
                [module]: {
                    ...prev[module],
                    [field]: Array.from(current),
                },
            };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await marksWorkflowApi.updateSettings(draft);
            setDraft({
                ACADEMICS_BULK: {
                    dataEntryUserIds: response.settings.ACADEMICS_BULK.dataEntryUserIds,
                    verificationUserIds: response.settings.ACADEMICS_BULK.verificationUserIds,
                    postVerificationOverrideMode:
                        response.settings.ACADEMICS_BULK.postVerificationOverrideMode,
                },
                PT_BULK: {
                    dataEntryUserIds: response.settings.PT_BULK.dataEntryUserIds,
                    verificationUserIds: response.settings.PT_BULK.verificationUserIds,
                    postVerificationOverrideMode: response.settings.PT_BULK.postVerificationOverrideMode,
                },
            });
            toast.success("Marks review workflow settings saved.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save workflow settings.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout
            title="Marks Review Workflow"
            description="Configure data entry, verification, and override rights for bulk marks workflows."
        >
            <main className="p-6 space-y-6">
                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "General Management", href: "/dashboard/genmgmt?tab=settings" },
                        { label: "Marks Review Workflow" },
                    ]}
                />

                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-primary">Marks Review Workflow</h2>
                        <p className="text-muted-foreground">
                            Configure direct users for data entry and verification. Workflow becomes active when both lists are set.
                        </p>
                    </div>
                    <Button onClick={handleSave} disabled={saving || settingsQuery.isLoading || usersQuery.isLoading}>
                        {saving ? "Saving..." : "Save Settings"}
                    </Button>
                </div>

                {settingsQuery.error ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                        {(settingsQuery.error as Error).message}
                    </div>
                ) : null}

                {usersQuery.error ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                        {(usersQuery.error as Error).message}
                    </div>
                ) : null}

                {(["ACADEMICS_BULK", "PT_BULK"] as const).map((module) => {
                    const moduleDraft = draft[module];
                    const query = searchByModule[module].trim().toLowerCase();
                    const filteredUsers = !query
                        ? selectableUsers
                        : selectableUsers.filter((user) => {
                            const haystack = `${user.username} ${user.name} ${user.rank ?? ""}`.toLowerCase();
                            return haystack.includes(query);
                        });

                    return (
                        <Card key={module}>
                            <CardHeader>
                                <div className="flex flex-wrap items-center gap-3">
                                    <CardTitle>{MODULE_COPY[module].title}</CardTitle>
                                    <Badge variant={moduleDraft.dataEntryUserIds.length && moduleDraft.verificationUserIds.length ? "default" : "outline"}>
                                        {moduleDraft.dataEntryUserIds.length && moduleDraft.verificationUserIds.length ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                                <CardDescription>{MODULE_COPY[module].description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Search Users</Label>
                                    <Input
                                        value={searchByModule[module]}
                                        onChange={(e) =>
                                            setSearchByModule((prev) => ({
                                                ...prev,
                                                [module]: e.target.value,
                                            }))
                                        }
                                        placeholder="Search by username, name, or rank"
                                    />
                                </div>

                                <div className="grid gap-6 lg:grid-cols-2">
                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="font-semibold">Data Entry Users</h3>
                                            <p className="text-sm text-muted-foreground">These users can save draft data and submit for verification.</p>
                                        </div>
                                        <div className="max-h-80 space-y-2 overflow-auto rounded-md border p-3">
                                            {filteredUsers.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">
                                                    No users match the current filters.
                                                </p>
                                            ) : null}
                                            {filteredUsers.map((user) => {
                                                const isSelectedAsVerifier = moduleDraft.verificationUserIds.includes(user.id!);
                                                return (
                                                <label key={`${module}-maker-${user.id}`} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                                                    <Checkbox
                                                        checked={moduleDraft.dataEntryUserIds.includes(user.id!)}
                                                        disabled={isSelectedAsVerifier}
                                                        onCheckedChange={() => toggleUser(module, "dataEntryUserIds", user.id!)}
                                                    />
                                                    <span className="flex-1">{formatUserLabel(user)}</span>
                                                    {user.isActive === false ? (
                                                        <Badge variant="outline">Inactive Flag</Badge>
                                                    ) : null}
                                                    {isSelectedAsVerifier ? (
                                                        <Badge variant="secondary">Verifier</Badge>
                                                    ) : null}
                                                </label>
                                            )})}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="font-semibold">Verification Users</h3>
                                            <p className="text-sm text-muted-foreground">These users can edit pending tickets, request changes, and publish.</p>
                                        </div>
                                        <div className="max-h-80 space-y-2 overflow-auto rounded-md border p-3">
                                            {filteredUsers.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">
                                                    No users match the current filters.
                                                </p>
                                            ) : null}
                                            {filteredUsers.map((user) => {
                                                const isSelectedAsMaker = moduleDraft.dataEntryUserIds.includes(user.id!);
                                                return (
                                                <label key={`${module}-verifier-${user.id}`} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                                                    <Checkbox
                                                        checked={moduleDraft.verificationUserIds.includes(user.id!)}
                                                        disabled={isSelectedAsMaker}
                                                        onCheckedChange={() => toggleUser(module, "verificationUserIds", user.id!)}
                                                    />
                                                    <span className="flex-1">{formatUserLabel(user)}</span>
                                                    {user.isActive === false ? (
                                                        <Badge variant="outline">Inactive Flag</Badge>
                                                    ) : null}
                                                    {isSelectedAsMaker ? (
                                                        <Badge variant="secondary">Data Entry</Badge>
                                                    ) : null}
                                                </label>
                                            )})}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Post-Verification Override Policy</Label>
                                    <select
                                        className="w-full rounded-md border px-3 py-2 text-sm"
                                        value={moduleDraft.postVerificationOverrideMode}
                                        onChange={(e) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                [module]: {
                                                    ...prev[module],
                                                    postVerificationOverrideMode: e.target.value as WorkflowModuleDraft["postVerificationOverrideMode"],
                                                },
                                            }))
                                        }
                                    >
                                        <option value="SUPER_ADMIN_ONLY">SUPER_ADMIN only</option>
                                        <option value="ADMIN_AND_SUPER_ADMIN">ADMIN and SUPER_ADMIN</option>
                                    </select>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </main>
        </DashboardLayout>
    );
}
