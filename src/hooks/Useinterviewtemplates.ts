import { useState } from "react";
import { toast } from "sonner";
import {
    InterviewTemplate,
    InterviewTemplateCreate,
    InterviewTemplateUpdate,
    listTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    ListParams,
} from "@/app/lib/api/Interviewtemplateapi";

export function useInterviewTemplates() {
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState<InterviewTemplate[]>([]);

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

    return {
        loading,
        templates,
        fetchTemplates,
        fetchTemplateById,
        addTemplate,
        editTemplate,
        removeTemplate,
    };
}