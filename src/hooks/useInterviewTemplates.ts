import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
    addTemplateSemester,
    createFieldOption,
    createGroup,
    createGroupField,
    createSection,
    createSectionField,
    createTemplate,
    deleteField,
    deleteFieldOption,
    deleteGroup,
    deleteSection,
    deleteTemplate,
    FieldCreate,
    FieldOptionCreate,
    FieldOptionUpdate,
    FieldUpdate,
    getTemplateById,
    Group,
    GroupCreate,
    GroupUpdate,
    InterviewTemplate,
    InterviewTemplateCreate,
    InterviewTemplateUpdate,
    listFieldOptions,
    listGroupFields,
    listGroups,
    ListParams,
    listSectionFields,
    listSections,
    listTemplateSemesters,
    listTemplates,
    removeTemplateSemester,
    Section,
    SectionCreate,
    SectionUpdate,
    TemplateSemester,
    updateField,
    updateFieldOption,
    updateGroup,
    updateSection,
    updateTemplate,
} from "@/app/lib/api/Interviewtemplateapi";

export function useInterviewTemplates() {
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
    const [currentTemplate, setCurrentTemplate] = useState<InterviewTemplate | null>(null);
    const [semesters, setSemesters] = useState<TemplateSemester[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);

    const fetchTemplates = useCallback(async (params?: ListParams) => {
        setLoading(true);
        try {
            const response = await listTemplates(params);
            const items = response.templates || [];
            setTemplates(items);
            return items;
        } catch (error) {
            console.error("Error fetching interview templates:", error);
            toast.error("Failed to load interview templates");
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTemplateById = useCallback(async (templateId: string) => {
        setLoading(true);
        try {
            const template = await getTemplateById(templateId);
            setCurrentTemplate(template);
            return template;
        } catch (error) {
            console.error("Error fetching interview template:", error);
            toast.error("Failed to load interview template");
            setCurrentTemplate(null);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const addTemplate = useCallback(async (payload: InterviewTemplateCreate) => {
        setLoading(true);
        try {
            const template = await createTemplate(payload);
            toast.success("Template created successfully");
            return template;
        } catch (error) {
            console.error("Error creating interview template:", error);
            toast.error("Failed to create template");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const editTemplate = useCallback(async (templateId: string, payload: InterviewTemplateUpdate) => {
        setLoading(true);
        try {
            const template = await updateTemplate(templateId, payload);
            toast.success("Template updated successfully");
            return template;
        } catch (error) {
            console.error("Error updating interview template:", error);
            toast.error("Failed to update template");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const removeTemplate = useCallback(async (templateId: string, hard = false) => {
        setLoading(true);
        try {
            await deleteTemplate(templateId, hard);
            toast.success("Template deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting interview template:", error);
            toast.error("Failed to delete template");
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTemplateSemesters = useCallback(async (templateId: string) => {
        setLoading(true);
        try {
            const response = await listTemplateSemesters(templateId);
            const items = response.semesters || [];
            setSemesters(items);
            return items;
        } catch (error) {
            console.error("Error fetching template semesters:", error);
            toast.error("Failed to load template semesters");
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const addSemesterToTemplate = useCallback(async (templateId: string, semester: number) => {
        setLoading(true);
        try {
            const result = await addTemplateSemester(templateId, { semester });
            toast.success(`Semester ${semester} added`);
            return result;
        } catch (error) {
            console.error("Error adding template semester:", error);
            toast.error("Failed to add semester");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const removeSemesterFromTemplate = useCallback(async (templateId: string, semester: number) => {
        setLoading(true);
        try {
            await removeTemplateSemester(templateId, semester);
            toast.success(`Semester ${semester} removed`);
            return true;
        } catch (error) {
            console.error("Error removing template semester:", error);
            toast.error("Failed to remove semester");
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSections = useCallback(async (templateId: string, params?: ListParams) => {
        setLoading(true);
        try {
            const response = await listSections(templateId, params);
            const items = response.sections || [];
            setSections(items);
            return items;
        } catch (error) {
            console.error("Error fetching sections:", error);
            toast.error("Failed to load sections");
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const addSection = useCallback(async (templateId: string, payload: SectionCreate) => {
        setLoading(true);
        try {
            const section = await createSection(templateId, payload);
            toast.success("Section created successfully");
            return section;
        } catch (error) {
            console.error("Error creating section:", error);
            toast.error("Failed to create section");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const editSection = useCallback(async (templateId: string, sectionId: string, payload: SectionUpdate) => {
        setLoading(true);
        try {
            const section = await updateSection(templateId, sectionId, payload);
            toast.success("Section updated successfully");
            return section;
        } catch (error) {
            console.error("Error updating section:", error);
            toast.error("Failed to update section");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const removeSection = useCallback(async (templateId: string, sectionId: string, hard = false) => {
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
    }, []);

    const fetchGroups = useCallback(async (templateId: string, params?: ListParams) => {
        setLoading(true);
        try {
            const response = await listGroups(templateId, params);
            const items = response.groups || [];
            setGroups(items);
            return items;
        } catch (error) {
            console.error("Error fetching groups:", error);
            toast.error("Failed to load groups");
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const addGroup = useCallback(async (templateId: string, payload: GroupCreate) => {
        setLoading(true);
        try {
            const group = await createGroup(templateId, payload);
            toast.success("Group created successfully");
            return group;
        } catch (error) {
            console.error("Error creating group:", error);
            toast.error("Failed to create group");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const editGroup = useCallback(async (templateId: string, groupId: string, payload: GroupUpdate) => {
        setLoading(true);
        try {
            const group = await updateGroup(templateId, groupId, payload);
            toast.success("Group updated successfully");
            return group;
        } catch (error) {
            console.error("Error updating group:", error);
            toast.error("Failed to update group");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const removeGroup = useCallback(async (templateId: string, groupId: string, hard = false) => {
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
    }, []);

    const fetchSectionFields = useCallback(async (templateId: string, sectionId: string, params?: ListParams) => {
        setLoading(true);
        try {
            const response = await listSectionFields(templateId, sectionId, params);
            return response.fields || [];
        } catch (error) {
            console.error("Error fetching section fields:", error);
            toast.error("Failed to load section fields");
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const addSectionField = useCallback(async (templateId: string, sectionId: string, payload: FieldCreate) => {
        setLoading(true);
        try {
            const field = await createSectionField(templateId, sectionId, payload);
            toast.success("Field created successfully");
            return field;
        } catch (error) {
            console.error("Error creating section field:", error);
            toast.error("Failed to create field");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchGroupFields = useCallback(async (templateId: string, groupId: string, params?: ListParams) => {
        setLoading(true);
        try {
            const response = await listGroupFields(templateId, groupId, params);
            return response.fields || [];
        } catch (error) {
            console.error("Error fetching group fields:", error);
            toast.error("Failed to load group fields");
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const addGroupField = useCallback(async (templateId: string, groupId: string, payload: FieldCreate) => {
        setLoading(true);
        try {
            const field = await createGroupField(templateId, groupId, payload);
            toast.success("Field created successfully");
            return field;
        } catch (error) {
            console.error("Error creating group field:", error);
            toast.error("Failed to create field");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const editField = useCallback(async (templateId: string, fieldId: string, payload: FieldUpdate) => {
        setLoading(true);
        try {
            const field = await updateField(templateId, fieldId, payload);
            toast.success("Field updated successfully");
            return field;
        } catch (error) {
            console.error("Error updating field:", error);
            toast.error("Failed to update field");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const removeField = useCallback(async (templateId: string, fieldId: string, hard = false) => {
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
    }, []);

    const fetchFieldOptions = useCallback(async (templateId: string, fieldId: string, params?: ListParams) => {
        setLoading(true);
        try {
            const response = await listFieldOptions(templateId, fieldId, params);
            return response.options || [];
        } catch (error) {
            console.error("Error fetching field options:", error);
            toast.error("Failed to load field options");
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const addFieldOption = useCallback(async (templateId: string, fieldId: string, payload: FieldOptionCreate) => {
        setLoading(true);
        try {
            const option = await createFieldOption(templateId, fieldId, payload);
            toast.success("Option added successfully");
            return option;
        } catch (error) {
            console.error("Error creating field option:", error);
            toast.error("Failed to add option");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const editFieldOption = useCallback(async (templateId: string, fieldId: string, optionId: string, payload: FieldOptionUpdate) => {
        setLoading(true);
        try {
            const option = await updateFieldOption(templateId, fieldId, optionId, payload);
            toast.success("Option updated successfully");
            return option;
        } catch (error) {
            console.error("Error updating field option:", error);
            toast.error("Failed to update option");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const removeFieldOption = useCallback(async (templateId: string, fieldId: string, optionId: string, hard = false) => {
        setLoading(true);
        try {
            await deleteFieldOption(templateId, fieldId, optionId, hard);
            toast.success("Option deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting field option:", error);
            toast.error("Failed to delete option");
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        templates,
        currentTemplate,
        semesters,
        sections,
        groups,
        fetchTemplates,
        fetchTemplateById,
        addTemplate,
        editTemplate,
        removeTemplate,
        fetchTemplateSemesters,
        addSemesterToTemplate,
        removeSemesterFromTemplate,
        fetchSections,
        addSection,
        editSection,
        removeSection,
        fetchGroups,
        addGroup,
        editGroup,
        removeGroup,
        fetchSectionFields,
        addSectionField,
        fetchGroupFields,
        addGroupField,
        editField,
        removeField,
        fetchFieldOptions,
        addFieldOption,
        editFieldOption,
        removeFieldOption,
    };
}
