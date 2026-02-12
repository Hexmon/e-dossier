// components/interview-mgmt/template-detail/TemplateGroups.tsx
"use client";

import { useState } from "react";
import { useInterviewTemplates } from "@/hooks/useInterviewTemplates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Grid3x3 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import GroupDialog from "./GroupDialog";
import GroupFieldsDialog from "./GroupFieldsDialog";
import { Group } from "@/app/lib/api/Interviewtemplateapi";

interface TemplateGroupsProps {
    templateId: string;
}

export default function TemplateGroups({ templateId }: TemplateGroupsProps) {
    const {
        loading,
        groups,
        sections,
        addGroup,
        editGroup,
        removeGroup,
    } = useInterviewTemplates({ templateId }); // Pass templateId to enable queries

    const [groupDialogOpen, setGroupDialogOpen] = useState(false);
    const [fieldsDialogOpen, setFieldsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

    // No useEffect needed - React Query fetches automatically when templateId is set

    const handleAddGroup = () => {
        setEditingGroup(undefined);
        setGroupDialogOpen(true);
    };

    const handleEditGroup = (group: Group) => {
        setEditingGroup(group);
        setGroupDialogOpen(true);
    };

    const handleDeleteGroup = (groupId: string) => {
        setGroupToDelete(groupId);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (groupToDelete) {
            await removeGroup(templateId, groupToDelete, false);
        }
        setDeleteDialogOpen(false);
        setGroupToDelete(null);
    };

    const handleManageFields = (group: Group) => {
        setSelectedGroup(group);
        setFieldsDialogOpen(true);
    };

    const handleGroupSubmit = async (data: any) => {
        if (editingGroup) {
            await editGroup(templateId, editingGroup.id, data);
        } else {
            await addGroup(templateId, data);
        }
        setGroupDialogOpen(false);
        setEditingGroup(undefined);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Grid3x3 className="h-5 w-5" />
                            Template Groups (Repeatable Tables)
                        </CardTitle>
                        <Button onClick={handleAddGroup} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Group
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Grid3x3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No groups created yet</p>
                            <p className="text-sm mt-1">
                                Groups are used for repeatable tables like "Interview Sheet: Special"
                            </p>
                            <Button variant="outline" onClick={handleAddGroup} className="mt-4">
                                Create First Group
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {groups.map((group) => (
                                <div
                                    key={group.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold">{group.title}</h4>
                                            <Badge variant="outline" className="text-xs">
                                                Order: {group.sortOrder}
                                            </Badge>
                                            {group.isActive ? (
                                                <Badge className="bg-success text-xs">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-xs">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Rows: {group.minRows} - {group.maxRows}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleManageFields(group)}
                                        >
                                            Manage Columns
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditGroup(group)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteGroup(group.id)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <GroupDialog
                open={groupDialogOpen}
                onOpenChange={setGroupDialogOpen}
                onSubmit={handleGroupSubmit}
                group={editingGroup}
                sections={sections}
                isLoading={loading}
            />

            {selectedGroup && (
                <GroupFieldsDialog
                    open={fieldsDialogOpen}
                    onOpenChange={setFieldsDialogOpen}
                    templateId={templateId}
                    group={selectedGroup}
                />
            )}

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Group</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this group? This action will soft delete
                            the group and can be restored later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setGroupToDelete(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
