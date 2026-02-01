// hooks/useInterviewTemplates.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    FieldCreate,
    FieldUpdate,
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
    updateSection,
    deleteSection,
    listGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    listSectionFields,
    createSectionField,
    listGroupFields,
    createGroupField,
    updateField,
    deleteField,
    listFieldOptions,
    createFieldOption,
    updateFieldOption,
    deleteFieldOption,
    ListParams,
} from "@/app/lib/api/Interviewtemplateapi";

// ---------------------------------------------------------------------------
// Query key factories — single source of truth so invalidation is consistent
// ---------------------------------------------------------------------------
const QUERY_KEYS = {
    templates: (params?: ListParams) => ["interviewTemplates", params ?? {}] as const,
    templateById: (id: string) => ["interviewTemplates", id] as const,
    semesters: (templateId: string) => ["interviewTemplates", templateId, "semesters"] as const,
    sections: (templateId: string, params?: ListParams) =>
        ["interviewTemplates", templateId, "sections", params ?? {}] as const,
    groups: (templateId: string, params?: ListParams) =>
        ["interviewTemplates", templateId, "groups", params ?? {}] as const,
    sectionFields: (templateId: string, sectionId: string, params?: ListParams) =>
        ["interviewTemplates", templateId, "sections", sectionId, "fields", params ?? {}] as const,
    groupFields: (templateId: string, groupId: string, params?: ListParams) =>
        ["interviewTemplates", templateId, "groups", groupId, "fields", params ?? {}] as const,
    fieldOptions: (templateId: string, fieldId: string, params?: ListParams) =>
        ["interviewTemplates", templateId, "fields", fieldId, "options", params ?? {}] as const,
} as const;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useInterviewTemplates(options?: {
    templateId?: string;
    listParams?: ListParams;
}) {
    const queryClient = useQueryClient();
    const templateId = options?.templateId ?? "";
    const listParams = options?.listParams;

    // -----------------------------------------------------------------------
    // Queries
    // -----------------------------------------------------------------------
    const templatesQuery = useQuery({
        queryKey: QUERY_KEYS.templates(listParams),
        queryFn: async () => {
            const data = await listTemplates(listParams);
            return data?.templates ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const templateByIdQuery = useQuery({
        queryKey: QUERY_KEYS.templateById(templateId),
        queryFn: () => getTemplateById(templateId),
        enabled: templateId.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    const semestersQuery = useQuery({
        queryKey: QUERY_KEYS.semesters(templateId),
        queryFn: async () => {
            const data = await listTemplateSemesters(templateId);
            return data?.semesters ?? [];
        },
        enabled: templateId.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    const sectionsQuery = useQuery({
        queryKey: QUERY_KEYS.sections(templateId),
        queryFn: async () => {
            const data = await listSections(templateId);
            return data?.sections ?? [];
        },
        enabled: templateId.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    const groupsQuery = useQuery({
        queryKey: QUERY_KEYS.groups(templateId),
        queryFn: async () => {
            const data = await listGroups(templateId);
            return data?.groups ?? [];
        },
        enabled: templateId.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    // -----------------------------------------------------------------------
    // Template mutations
    // -----------------------------------------------------------------------
    const createTemplateMutation = useMutation({
        mutationFn: async (template: InterviewTemplateCreate) => {
            const created = await createTemplate(template);

            if (template.semesters?.length && created.id) {
                await Promise.all(
                    template.semesters.map((sem) =>
                        addTemplateSemester(created.id, { semester: sem })
                    )
                );
            }

            return created;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["interviewTemplates"] });
            toast.success("Template created successfully");
        },
        onError: (error) => {
            console.error("Error creating template:", error);
            toast.error("Failed to create template");
        },
    });

    const updateTemplateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: InterviewTemplateUpdate }) =>
            updateTemplate(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["interviewTemplates"] });
            toast.success("Template updated successfully");
        },
        onError: (error) => {
            console.error("Error updating template:", error);
            toast.error("Failed to update template");
        },
    });

    const deleteTemplateMutation = useMutation({
        mutationFn: ({ id, hard }: { id: string; hard: boolean }) => deleteTemplate(id, hard),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["interviewTemplates"] });
            toast.success("Template deleted successfully");
        },
        onError: (error) => {
            console.error("Error deleting template:", error);
            toast.error("Failed to delete template");
        },
    });

    // -----------------------------------------------------------------------
    // Semester mutations
    // -----------------------------------------------------------------------
    const addSemesterMutation = useMutation({
        mutationFn: ({ id, semester }: { id: string; semester: number }) =>
            addTemplateSemester(id, { semester }),
        onSuccess: (_, { semester }) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.semesters(templateId) });
            toast.success(`Semester ${semester} added successfully`);
        },
        onError: (error) => {
            console.error("Error adding semester:", error);
            toast.error("Failed to add semester");
        },
    });

    const removeSemesterMutation = useMutation({
        mutationFn: ({ id, semester }: { id: string; semester: number }) =>
            removeTemplateSemester(id, semester),
        onSuccess: (_, { semester }) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.semesters(templateId) });
            toast.success(`Semester ${semester} removed successfully`);
        },
        onError: (error) => {
            console.error("Error removing semester:", error);
            toast.error("Failed to remove semester");
        },
    });

    // -----------------------------------------------------------------------
    // Section mutations
    // -----------------------------------------------------------------------
    const createSectionMutation = useMutation({
        mutationFn: ({ tid, section }: { tid: string; section: SectionCreate }) =>
            createSection(tid, section),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sections(templateId) });
            toast.success("Section created successfully");
        },
        onError: (error) => {
            console.error("Error creating section:", error);
            toast.error("Failed to create section");
        },
    });

    const updateSectionMutation = useMutation({
        mutationFn: ({ tid, sectionId, updates }: {
            tid: string;
            sectionId: string;
            updates: SectionUpdate;
        }) => updateSection(tid, sectionId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sections(templateId) });
            toast.success("Section updated successfully");
        },
        onError: (error) => {
            console.error("Error updating section:", error);
            toast.error("Failed to update section");
        },
    });

    const deleteSectionMutation = useMutation({
        mutationFn: ({ tid, sectionId, hard }: {
            tid: string;
            sectionId: string;
            hard: boolean;
        }) => deleteSection(tid, sectionId, hard),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sections(templateId) });
            toast.success("Section deleted successfully");
        },
        onError: (error) => {
            console.error("Error deleting section:", error);
            toast.error("Failed to delete section");
        },
    });

    // -----------------------------------------------------------------------
    // Group mutations
    // -----------------------------------------------------------------------
    const createGroupMutation = useMutation({
        mutationFn: ({ tid, group }: { tid: string; group: GroupCreate }) =>
            createGroup(tid, group),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups(templateId) });
            toast.success("Group created successfully");
        },
        onError: (error) => {
            console.error("Error creating group:", error);
            toast.error("Failed to create group");
        },
    });

    const updateGroupMutation = useMutation({
        mutationFn: ({ tid, groupId, updates }: {
            tid: string;
            groupId: string;
            updates: GroupUpdate;
        }) => updateGroup(tid, groupId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups(templateId) });
            toast.success("Group updated successfully");
        },
        onError: (error) => {
            console.error("Error updating group:", error);
            toast.error("Failed to update group");
        },
    });

    const deleteGroupMutation = useMutation({
        mutationFn: ({ tid, groupId, hard }: {
            tid: string;
            groupId: string;
            hard: boolean;
        }) => deleteGroup(tid, groupId, hard),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups(templateId) });
            toast.success("Group deleted successfully");
        },
        onError: (error) => {
            console.error("Error deleting group:", error);
            toast.error("Failed to delete group");
        },
    });

    // -----------------------------------------------------------------------
    // Field mutations
    // -----------------------------------------------------------------------
    const createSectionFieldMutation = useMutation({
        mutationFn: ({ tid, sectionId, field }: {
            tid: string;
            sectionId: string;
            field: FieldCreate;
        }) => createSectionField(tid, sectionId, field),
        onSuccess: (_, { tid, sectionId }) => {
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.sectionFields(tid, sectionId),
            });
            toast.success("Field created successfully");
        },
        onError: (error) => {
            console.error("Error creating field:", error);
            toast.error("Failed to create field");
        },
    });

    const createGroupFieldMutation = useMutation({
        mutationFn: ({ tid, groupId, field }: {
            tid: string;
            groupId: string;
            field: FieldCreate;
        }) => createGroupField(tid, groupId, field),
        onSuccess: (_, { tid, groupId }) => {
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.groupFields(tid, groupId),
            });
            toast.success("Field created successfully");
        },
        onError: (error) => {
            console.error("Error creating field:", error);
            toast.error("Failed to create field");
        },
    });

    const updateFieldMutation = useMutation({
        mutationFn: ({ tid, fieldId, updates }: {
            tid: string;
            fieldId: string;
            updates: FieldUpdate;
        }) => updateField(tid, fieldId, updates),
        onSuccess: () => {
            // Invalidate all field queries under this template since we don't
            // know whether it's a section or group field at this level
            queryClient.invalidateQueries({
                queryKey: ["interviewTemplates", templateId, "sections"],
            });
            queryClient.invalidateQueries({
                queryKey: ["interviewTemplates", templateId, "groups"],
            });
            toast.success("Field updated successfully");
        },
        onError: (error) => {
            console.error("Error updating field:", error);
            toast.error("Failed to update field");
        },
    });

    const deleteFieldMutation = useMutation({
        mutationFn: ({ tid, fieldId, hard }: {
            tid: string;
            fieldId: string;
            hard: boolean;
        }) => deleteField(tid, fieldId, hard),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["interviewTemplates", templateId, "sections"],
            });
            queryClient.invalidateQueries({
                queryKey: ["interviewTemplates", templateId, "groups"],
            });
            toast.success("Field deleted successfully");
        },
        onError: (error) => {
            console.error("Error deleting field:", error);
            toast.error("Failed to delete field");
        },
    });

    // -----------------------------------------------------------------------
    // Field option mutations
    // -----------------------------------------------------------------------
    const createFieldOptionMutation = useMutation({
        mutationFn: ({ tid, fieldId, option }: {
            tid: string;
            fieldId: string;
            option: FieldOptionCreate;
        }) => createFieldOption(tid, fieldId, option),
        onSuccess: (_, { tid, fieldId }) => {
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.fieldOptions(tid, fieldId),
            });
            toast.success("Option created successfully");
        },
        onError: (error) => {
            console.error("Error creating option:", error);
            toast.error("Failed to create option");
        },
    });

    const updateFieldOptionMutation = useMutation({
        mutationFn: ({ tid, fieldId, optionId, updates }: {
            tid: string;
            fieldId: string;
            optionId: string;
            updates: FieldOptionUpdate;
        }) => updateFieldOption(tid, fieldId, optionId, updates),
        onSuccess: (_, { tid, fieldId }) => {
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.fieldOptions(tid, fieldId),
            });
            toast.success("Option updated successfully");
        },
        onError: (error) => {
            console.error("Error updating option:", error);
            toast.error("Failed to update option");
        },
    });

    const deleteFieldOptionMutation = useMutation({
        mutationFn: ({ tid, fieldId, optionId, hard }: {
            tid: string;
            fieldId: string;
            optionId: string;
            hard: boolean;
        }) => deleteFieldOption(tid, fieldId, optionId, hard),
        onSuccess: (_, { tid, fieldId }) => {
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.fieldOptions(tid, fieldId),
            });
            toast.success("Option deleted successfully");
        },
        onError: (error) => {
            console.error("Error deleting option:", error);
            toast.error("Failed to delete option");
        },
    });

    // -----------------------------------------------------------------------
    // Derived loading — true if any currently-enabled query is still fetching
    // -----------------------------------------------------------------------
    const loading =
        templatesQuery.isLoading ||
        templateByIdQuery.isLoading ||
        semestersQuery.isLoading ||
        sectionsQuery.isLoading ||
        groupsQuery.isLoading;

    // -----------------------------------------------------------------------
    // Public API  (matches original hook surface as closely as possible)
    // -----------------------------------------------------------------------
    return {
        // State
        loading,
        templates: templatesQuery.data ?? [],
        currentTemplate: templateByIdQuery.data ?? null,
        semesters: semestersQuery.data ?? [],
        sections: sectionsQuery.data ?? [],
        groups: groupsQuery.data ?? [],

        // Manual refetch helpers (rarely needed — mutations invalidate automatically)
        fetchTemplates: () =>
            queryClient.invalidateQueries({ queryKey: ["interviewTemplates"] }),
        fetchTemplateById: (id: string) =>
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.templateById(id) }),

        // Template operations
        addTemplate: (template: InterviewTemplateCreate) =>
            createTemplateMutation.mutateAsync(template),
        editTemplate: (id: string, updates: InterviewTemplateUpdate) =>
            updateTemplateMutation.mutateAsync({ id, updates }),
        removeTemplate: (id: string, hard = false) =>
            deleteTemplateMutation.mutateAsync({ id, hard }),

        // Semester operations
        fetchTemplateSemesters: () =>
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.semesters(templateId) }),
        addSemesterToTemplate: (id: string, semester: number) =>
            addSemesterMutation.mutateAsync({ id, semester }),
        removeSemesterFromTemplate: (id: string, semester: number) =>
            removeSemesterMutation.mutateAsync({ id, semester }),

        // Section operations
        fetchSections: () =>
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sections(templateId) }),
        addSection: (tid: string, section: SectionCreate) =>
            createSectionMutation.mutateAsync({ tid, section }),
        editSection: (tid: string, sectionId: string, updates: SectionUpdate) =>
            updateSectionMutation.mutateAsync({ tid, sectionId, updates }),
        removeSection: (tid: string, sectionId: string, hard = false) =>
            deleteSectionMutation.mutateAsync({ tid, sectionId, hard }),

        // Group operations
        fetchGroups: () =>
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups(templateId) }),
        addGroup: (tid: string, group: GroupCreate) =>
            createGroupMutation.mutateAsync({ tid, group }),
        editGroup: (tid: string, groupId: string, updates: GroupUpdate) =>
            updateGroupMutation.mutateAsync({ tid, groupId, updates }),
        removeGroup: (tid: string, groupId: string, hard = false) =>
            deleteGroupMutation.mutateAsync({ tid, groupId, hard }),

        // Field operations
        fetchSectionFields: (tid: string, sectionId: string) =>
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.sectionFields(tid, sectionId),
            }),
        fetchGroupFields: (tid: string, groupId: string) =>
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.groupFields(tid, groupId),
            }),
        addSectionField: (tid: string, sectionId: string, field: FieldCreate) =>
            createSectionFieldMutation.mutateAsync({ tid, sectionId, field }),
        addGroupField: (tid: string, groupId: string, field: FieldCreate) =>
            createGroupFieldMutation.mutateAsync({ tid, groupId, field }),
        editField: (tid: string, fieldId: string, updates: FieldUpdate) =>
            updateFieldMutation.mutateAsync({ tid, fieldId, updates }),
        removeField: (tid: string, fieldId: string, hard = false) =>
            deleteFieldMutation.mutateAsync({ tid, fieldId, hard }),

        // Field option operations
        fetchFieldOptions: () => { }, // options are fetched on-demand in child components
        addFieldOption: (tid: string, fieldId: string, option: FieldOptionCreate) =>
            createFieldOptionMutation.mutateAsync({ tid, fieldId, option }),
        editFieldOption: (tid: string, fieldId: string, optionId: string, updates: FieldOptionUpdate) =>
            updateFieldOptionMutation.mutateAsync({ tid, fieldId, optionId, updates }),
        removeFieldOption: (tid: string, fieldId: string, optionId: string, hard = false) =>
            deleteFieldOptionMutation.mutateAsync({ tid, fieldId, optionId, hard }),
    };
}