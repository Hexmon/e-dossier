// components/interview-mgmt/template-detail/TemplateSections.tsx
"use client";

import { useState } from "react";
import { useInterviewTemplates } from "@/hooks/useInterviewTemplates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Layers } from "lucide-react";
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
import SectionDialog from "./SectionDialog";
import SectionFieldsDialog from "./SectionFieldsDialog";
import { Section } from "@/app/lib/api/Interviewtemplateapi";

interface TemplateSectionsProps {
    templateId: string;
}

export default function TemplateSections({ templateId }: TemplateSectionsProps) {
    // -------------------------------------------------------------------------
    // The detail page already passed templateId into useInterviewTemplates,
    // which enabled the sectionsQuery. No useEffect needed — the data is
    // already being fetched and cached.
    // -------------------------------------------------------------------------
    const {
        loading,
        sections,
        addSection,
        editSection,
        removeSection,
    } = useInterviewTemplates({ templateId });

    const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
    const [fieldsDialogOpen, setFieldsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<Section | undefined>(undefined);
    const [selectedSection, setSelectedSection] = useState<Section | null>(null);
    const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

    const handleAddSection = () => {
        setEditingSection(undefined);
        setSectionDialogOpen(true);
    };

    const handleEditSection = (section: Section) => {
        setEditingSection(section);
        setSectionDialogOpen(true);
    };

    const handleDeleteSection = (sectionId: string) => {
        setSectionToDelete(sectionId);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (sectionToDelete) {
            try {
                await removeSection(templateId, sectionToDelete, false);
                // Mutation's onSuccess already invalidated the sections query
            } catch {
                // Toast already shown by mutation onError
            }
        }
        setDeleteDialogOpen(false);
        setSectionToDelete(null);
    };

    const handleManageFields = (section: Section) => {
        setSelectedSection(section);
        setFieldsDialogOpen(true);
    };

    const handleSectionSubmit = async (data: any) => {
        try {
            if (editingSection) {
                await editSection(templateId, editingSection.id, data);
            } else {
                await addSection(templateId, data);
            }
            // Mutation's onSuccess already invalidated the sections query
            setSectionDialogOpen(false);
            setEditingSection(undefined);
        } catch {
            // Toast already shown by mutation onError
            // Don't close dialog on failure
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5" />
                            Template Sections
                        </CardTitle>
                        <Button onClick={handleAddSection} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Section
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        </div>
                    ) : sections.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No sections created yet</p>
                            <Button variant="outline" onClick={handleAddSection} className="mt-4">
                                Create First Section
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sections.map((section) => (
                                <div
                                    key={section.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold">{section.title}</h4>
                                            <Badge variant="outline" className="text-xs">
                                                Order: {section.sortOrder}
                                            </Badge>
                                            {section.isActive ? (
                                                <Badge className="bg-green-600 text-xs">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-xs">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </div>
                                        {section.description && (
                                            <p className="text-sm text-muted-foreground">
                                                {section.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleManageFields(section)}
                                        >
                                            Manage Fields
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditSection(section)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteSection(section.id)}
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

            <SectionDialog
                open={sectionDialogOpen}
                onOpenChange={setSectionDialogOpen}
                onSubmit={handleSectionSubmit}
                section={editingSection}
                isLoading={loading}
            />

            {selectedSection && (
                <SectionFieldsDialog
                    open={fieldsDialogOpen}
                    onOpenChange={setFieldsDialogOpen}
                    templateId={templateId}
                    section={selectedSection}
                />
            )}

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Section</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this section? This action will soft delete
                            the section and can be restored later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSectionToDelete(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}