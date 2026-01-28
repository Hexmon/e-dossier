// hooks/Useinterviewtemplates.ts
import { useState } from "react";
import { toast } from "sonner";
import {
    InterviewTemplate,
    InterviewTemplateCreate,
    InterviewTemplateUpdate,
    Section,
    SectionCreate,
    SectionUpdate,
    Group,
    GroupCreate,
    GroupUpdate,
    Field,
    FieldCreate,
    FieldUpdate,
    FieldOption,
    FieldOptionCreate,
    FieldOptionUpdate,
    TemplateSemester,
    listTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    listTemplateSemesters,
    addTemplateSemester,
    removeTemplateSemester,
    listSections,
    createSection,
    getSectionById,
    updateSection,
    deleteSection,
    listGroups,
    createGroup,
    getGroupById,
    updateGroup,
    deleteGroup,
    listSectionFields,
    createSectionField,
    listGroupFields,
    createGroupField,
    getFieldById,
    updateField,
    deleteField,
    listFieldOptions,
    createFieldOption,
    getFieldOptionById,
    updateFieldOption,
    deleteFieldOption,
    ListParams,
} from "@/app/lib/api/Interviewtemplateapi";

export function useInterviewTemplates() {
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
    const [currentTemplate, setCurrentTemplate] = useState<InterviewTemplate | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [fields, setFields] = useState<Field[]>([]);
    const [semesters, setSemesters] = useState<TemplateSemester[]>([]);

    // ============================================================================
    // Template Operations
    // ============================================================================

    const fetchTemplates = async (params?: ListParams) => {
        setLoading(true);
        try {
            const data = await listTemplates(params);
            const templatesList = data?.templates || [];
            setTemplates(templatesList);
            return templatesList;
        } catch (error) {
            console.error("Error fetching templates:", error);
            toast.error("Failed to load templates");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplateById = async (templateId: string) => {
        setLoading(true);
        try {
            const template = await getTemplateById(templateId);
            setCurrentTemplate(template);
            return template || null;
        } catch (error) {
            console.error("Error fetching template:", error);
            toast.error("Failed to load template details");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const addTemplate = async (template: InterviewTemplateCreate) => {
        setLoading(true);
        try {
            const newTemplate = await createTemplate(template);

            // Add semesters if provided
            if (template.semesters && template.semesters.length > 0 && newTemplate.id) {
                await Promise.all(
                    template.semesters.map(sem =>
                        addTemplateSemester(newTemplate.id, { semester: sem })
                    )
                );
            }

            toast.success("Template created successfully");
            return newTemplate || null;
        } catch (error) {
            console.error("Error creating template:", error);
            toast.error("Failed to create template");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editTemplate = async (templateId: string, updates: InterviewTemplateUpdate) => {
        setLoading(true);
        try {
            const updatedTemplate = await updateTemplate(templateId, updates);
            toast.success("Template updated successfully");
            return updatedTemplate || null;
        } catch (error) {
            console.error("Error updating template:", error);
            toast.error("Failed to update template");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removeTemplate = async (templateId: string, hard: boolean = false) => {
        setLoading(true);
        try {
            await deleteTemplate(templateId, hard);
            toast.success("Template deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting template:", error);
            toast.error("Failed to delete template");
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ============================================================================
    // Semester Operations
    // ============================================================================

    const fetchTemplateSemesters = async (templateId: string) => {
        setLoading(true);
        try {
            const data = await listTemplateSemesters(templateId);
            setSemesters(data.semesters || []);
            return data.semesters || [];
        } catch (error) {
            console.error("Error fetching semesters:", error);
            toast.error("Failed to load semesters");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const addSemesterToTemplate = async (templateId: string, semester: number) => {
        setLoading(true);
        try {
            await addTemplateSemester(templateId, { semester });
            toast.success(`Semester ${semester} added successfully`);
            return true;
        } catch (error) {
            console.error("Error adding semester:", error);
            toast.error("Failed to add semester");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const removeSemesterFromTemplate = async (templateId: string, semester: number) => {
        setLoading(true);
        try {
            await removeTemplateSemester(templateId, semester);
            toast.success(`Semester ${semester} removed successfully`);
            return true;
        } catch (error) {
            console.error("Error removing semester:", error);
            toast.error("Failed to remove semester");
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ============================================================================
    // Section Operations
    // ============================================================================

    const fetchSections = async (templateId: string, params?: ListParams) => {
        setLoading(true);
        try {
            const data = await listSections(templateId, params);
            setSections(data.sections || []);
            return data.sections || [];
        } catch (error) {
            console.error("Error fetching sections:", error);
            toast.error("Failed to load sections");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const addSection = async (templateId: string, section: SectionCreate) => {
        setLoading(true);
        try {
            const newSection = await createSection(templateId, section);
            toast.success("Section created successfully");
            return newSection || null;
        } catch (error) {
            console.error("Error creating section:", error);
            toast.error("Failed to create section");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editSection = async (
        templateId: string,
        sectionId: string,
        updates: SectionUpdate
    ) => {
        setLoading(true);
        try {
            const updatedSection = await updateSection(templateId, sectionId, updates);
            toast.success("Section updated successfully");
            return updatedSection || null;
        } catch (error) {
            console.error("Error updating section:", error);
            toast.error("Failed to update section");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removeSection = async (
        templateId: string,
        sectionId: string,
        hard: boolean = false
    ) => {
        setLoading(true);
        try {
            await deleteSection(templateId, sectionId, hard);
            toast.success("Section deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting section:", error);
            toast.error("Failed to delete section");
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ============================================================================
    // Group Operations
    // ============================================================================

    const fetchGroups = async (templateId: string, params?: ListParams) => {
        setLoading(true);
        try {
            const data = await listGroups(templateId, params);
            setGroups(data.groups || []);
            return data.groups || [];
        } catch (error) {
            console.error("Error fetching groups:", error);
            toast.error("Failed to load groups");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const addGroup = async (templateId: string, group: GroupCreate) => {
        setLoading(true);
        try {
            const newGroup = await createGroup(templateId, group);
            toast.success("Group created successfully");
            return newGroup || null;
        } catch (error) {
            console.error("Error creating group:", error);
            toast.error("Failed to create group");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editGroup = async (
        templateId: string,
        groupId: string,
        updates: GroupUpdate
    ) => {
        setLoading(true);
        try {
            const updatedGroup = await updateGroup(templateId, groupId, updates);
            toast.success("Group updated successfully");
            return updatedGroup || null;
        } catch (error) {
            console.error("Error updating group:", error);
            toast.error("Failed to update group");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removeGroup = async (
        templateId: string,
        groupId: string,
        hard: boolean = false
    ) => {
        setLoading(true);
        try {
            await deleteGroup(templateId, groupId, hard);
            toast.success("Group deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting group:", error);
            toast.error("Failed to delete group");
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ============================================================================
    // Field Operations
    // ============================================================================

    const fetchSectionFields = async (
        templateId: string,
        sectionId: string,
        params?: ListParams
    ) => {
        setLoading(true);
        try {
            const data = await listSectionFields(templateId, sectionId, params);
            return data.fields || [];
        } catch (error) {
            console.error("Error fetching section fields:", error);
            toast.error("Failed to load fields");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const fetchGroupFields = async (
        templateId: string,
        groupId: string,
        params?: ListParams
    ) => {
        setLoading(true);
        try {
            const data = await listGroupFields(templateId, groupId, params);
            return data.fields || [];
        } catch (error) {
            console.error("Error fetching group fields:", error);
            toast.error("Failed to load fields");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const addSectionField = async (
        templateId: string,
        sectionId: string,
        field: FieldCreate
    ) => {
        setLoading(true);
        try {
            const newField = await createSectionField(templateId, sectionId, field);
            toast.success("Field created successfully");
            return newField || null;
        } catch (error) {
            console.error("Error creating field:", error);
            toast.error("Failed to create field");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const addGroupField = async (
        templateId: string,
        groupId: string,
        field: FieldCreate
    ) => {
        setLoading(true);
        try {
            const newField = await createGroupField(templateId, groupId, field);
            toast.success("Field created successfully");
            return newField || null;
        } catch (error) {
            console.error("Error creating field:", error);
            toast.error("Failed to create field");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editField = async (
        templateId: string,
        fieldId: string,
        updates: FieldUpdate
    ) => {
        setLoading(true);
        try {
            const updatedField = await updateField(templateId, fieldId, updates);
            toast.success("Field updated successfully");
            return updatedField || null;
        } catch (error) {
            console.error("Error updating field:", error);
            toast.error("Failed to update field");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removeField = async (
        templateId: string,
        fieldId: string,
        hard: boolean = false
    ) => {
        setLoading(true);
        try {
            await deleteField(templateId, fieldId, hard);
            toast.success("Field deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting field:", error);
            toast.error("Failed to delete field");
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ============================================================================
    // Field Option Operations
    // ============================================================================

    const fetchFieldOptions = async (
        templateId: string,
        fieldId: string,
        params?: ListParams
    ) => {
        setLoading(true);
        try {
            const data = await listFieldOptions(templateId, fieldId, params);
            return data.options || [];
        } catch (error) {
            console.error("Error fetching field options:", error);
            toast.error("Failed to load options");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const addFieldOption = async (
        templateId: string,
        fieldId: string,
        option: FieldOptionCreate
    ) => {
        setLoading(true);
        try {
            const newOption = await createFieldOption(templateId, fieldId, option);
            toast.success("Option created successfully");
            return newOption || null;
        } catch (error) {
            console.error("Error creating option:", error);
            toast.error("Failed to create option");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const editFieldOption = async (
        templateId: string,
        fieldId: string,
        optionId: string,
        updates: FieldOptionUpdate
    ) => {
        setLoading(true);
        try {
            const updatedOption = await updateFieldOption(
                templateId,
                fieldId,
                optionId,
                updates
            );
            toast.success("Option updated successfully");
            return updatedOption || null;
        } catch (error) {
            console.error("Error updating option:", error);
            toast.error("Failed to update option");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const removeFieldOption = async (
        templateId: string,
        fieldId: string,
        optionId: string,
        hard: boolean = false
    ) => {
        setLoading(true);
        try {
            await deleteFieldOption(templateId, fieldId, optionId, hard);
            toast.success("Option deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting option:", error);
            toast.error("Failed to delete option");
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        templates,
        currentTemplate,
        sections,
        groups,
        fields,
        semesters,
        // Template operations
        fetchTemplates,
        fetchTemplateById,
        addTemplate,
        editTemplate,
        removeTemplate,
        // Semester operations
        fetchTemplateSemesters,
        addSemesterToTemplate,
        removeSemesterFromTemplate,
        // Section operations
        fetchSections,
        addSection,
        editSection,
        removeSection,
        // Group operations
        fetchGroups,
        addGroup,
        editGroup,
        removeGroup,
        // Field operations
        fetchSectionFields,
        fetchGroupFields,
        addSectionField,
        addGroupField,
        editField,
        removeField,
        // Field option operations
        fetchFieldOptions,
        addFieldOption,
        editFieldOption,
        removeFieldOption,
    };
}