// app/lib/api/Interviewtemplateapi.ts
import { api } from "@/app/lib/apiClient";

// ============================================================================
// Type Definitions
// ============================================================================

export interface InterviewTemplate {
    id: string;
    code: string;
    title: string;
    description: string | null;
    allowMultiple: boolean;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    semesters?: TemplateSemester[];
    sections?: Section[];
    groups?: Group[];
}

export interface InterviewTemplateCreate {
    code: string;
    title: string;
    description?: string;
    allowMultiple?: boolean;
    sortOrder?: number;
    isActive?: boolean;
    semesters?: number[];
}

export interface InterviewTemplateUpdate {
    code?: string;
    title?: string;
    description?: string;
    allowMultiple?: boolean;
    sortOrder?: number;
    isActive?: boolean;
}

export interface TemplateSemester {
    id: string;
    templateId: string;
    semester: number;
    createdAt: string;
}

export interface TemplateSemesterCreate {
    semester: number;
}

export interface Section {
    id: string;
    templateId: string;
    title: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    fields?: Field[];
}

export interface SectionCreate {
    title: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
}

export interface SectionUpdate {
    title?: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
}

export interface Group {
    id: string;
    templateId: string;
    sectionId: string;
    title: string;
    minRows: number;
    maxRows: number;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    fields?: Field[];
}

export interface GroupCreate {
    sectionId: string;
    title: string;
    minRows?: number;
    maxRows?: number;
    sortOrder?: number;
    isActive?: boolean;
}

export interface GroupUpdate {
    sectionId?: string;
    title?: string;
    minRows?: number;
    maxRows?: number;
    sortOrder?: number;
    isActive?: boolean;
}

export interface Field {
    id: string;
    templateId: string;
    sectionId: string | null;
    groupId: string | null;
    key: string;
    label: string;
    fieldType: string;
    required: boolean;
    sortOrder: number;
    captureFiledAt: boolean;
    captureSignature: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    options?: FieldOption[];
}

export interface FieldCreate {
    key: string;
    label: string;
    fieldType: string;
    required?: boolean;
    sortOrder?: number;
    captureFiledAt?: boolean;
    captureSignature?: boolean;
}

export interface FieldUpdate {
    key?: string;
    label?: string;
    fieldType?: string;
    required?: boolean;
    sortOrder?: number;
    captureFiledAt?: boolean;
    captureSignature?: boolean;
}

export interface FieldOption {
    id: string;
    fieldId: string;
    code: string;
    label: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface FieldOptionCreate {
    code: string;
    label: string;
    sortOrder?: number;
}

export interface FieldOptionUpdate {
    code?: string;
    label?: string;
    sortOrder?: number;
}

export interface ListParams {
    semester?: number;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
    [key: string]: string | number | boolean | undefined;
}

export interface DeleteParams {
    hard: boolean;
}

// ============================================================================
// Template APIs
// ============================================================================

export async function listTemplates(
    params?: ListParams
): Promise<{ templates: InterviewTemplate[] }> {
    const response = await api.get<{ items: InterviewTemplate[]; count: number }>(
        "/api/v1/admin/interview/templates",
        {
            query: params as Record<string, string | number | boolean | undefined>,
        }
    );
    return { templates: response.items || [] };
}

export async function getTemplateById(templateId: string): Promise<InterviewTemplate> {
    const res = await api.get<{ template: InterviewTemplate }>(
        `/api/v1/admin/interview/templates/${templateId}`
    );
    return res.template;
}

export async function createTemplate(
    payload: InterviewTemplateCreate
): Promise<InterviewTemplate> {
    const res = await api.post<{ template: InterviewTemplate }, InterviewTemplateCreate>(
        "/api/v1/admin/interview/templates",
        payload
    );
    return res.template;
}

export async function updateTemplate(
    templateId: string,
    payload: InterviewTemplateUpdate
): Promise<InterviewTemplate> {
    const res = await api.patch<{ template: InterviewTemplate }, InterviewTemplateUpdate>(
        `/api/v1/admin/interview/templates/${templateId}`,
        payload
    );
    return res.template;
}

export async function deleteTemplate(
    templateId: string,
    hard: boolean = false
): Promise<{ id: string; message: string }> {
    return await api.request({
        method: "DELETE",
        endpoint: `/api/v1/admin/interview/templates/${templateId}`,
        body: { hard },
    });
}

// ============================================================================
// Template Semester APIs
// ============================================================================

export async function listTemplateSemesters(
    templateId: string
): Promise<{ semesters: TemplateSemester[] }> {
    const response = await api.get<{ items: TemplateSemester[]; count: number }>(
        `/api/v1/admin/interview/templates/${templateId}/semesters`
    );
    return { semesters: response.items || [] };
}

export async function addTemplateSemester(
    templateId: string,
    payload: TemplateSemesterCreate
): Promise<TemplateSemester> {
    const res = await api.post<{ semester: TemplateSemester }, TemplateSemesterCreate>(
        `/api/v1/admin/interview/templates/${templateId}/semesters`,
        payload
    );
    return res.semester;
}

export async function removeTemplateSemester(
    templateId: string,
    semester: number
): Promise<{ message: string }> {
    return await api.delete(
        `/api/v1/admin/interview/templates/${templateId}/semesters/${semester}`
    );
}

// ============================================================================
// Section APIs
// ============================================================================

export async function listSections(
    templateId: string,
    params?: ListParams
): Promise<{ sections: Section[] }> {
    const response = await api.get<{ items: Section[]; count: number }>(
        `/api/v1/admin/interview/templates/${templateId}/sections`,
        {
            query: params as Record<string, string | number | boolean | undefined>,
        }
    );
    return { sections: response.items || [] };
}

export async function createSection(
    templateId: string,
    payload: SectionCreate
): Promise<Section> {
    const res = await api.post<{ section: Section }, SectionCreate>(
        `/api/v1/admin/interview/templates/${templateId}/sections`,
        payload
    );
    return res.section;
}

export async function getSectionById(
    templateId: string,
    sectionId: string
): Promise<Section> {
    const res = await api.get<{ section: Section }>(
        `/api/v1/admin/interview/templates/${templateId}/sections/${sectionId}`
    );
    return res.section;
}

export async function updateSection(
    templateId: string,
    sectionId: string,
    payload: SectionUpdate
): Promise<Section> {
    const res = await api.patch<{ section: Section }, SectionUpdate>(
        `/api/v1/admin/interview/templates/${templateId}/sections/${sectionId}`,
        payload
    );
    return res.section;
}

export async function deleteSection(
    templateId: string,
    sectionId: string,
    hard: boolean = false
): Promise<{ id: string; message: string }> {
    return await api.request({
        method: "DELETE",
        endpoint: `/api/v1/admin/interview/templates/${templateId}/sections/${sectionId}`,
        body: { hard },
    });
}

// ============================================================================
// Group APIs
// ============================================================================

export async function listGroups(
    templateId: string,
    params?: ListParams
): Promise<{ groups: Group[] }> {
    const response = await api.get<{ items: Group[]; count: number }>(
        `/api/v1/admin/interview/templates/${templateId}/groups`,
        {
            query: params as Record<string, string | number | boolean | undefined>,
        }
    );
    return { groups: response.items || [] };
}

export async function getGroupById(
    templateId: string,
    groupId: string
): Promise<Group> {
    const res = await api.get<{ group: Group }>(
        `/api/v1/admin/interview/templates/${templateId}/groups/${groupId}`
    );
    return res.group;
}

export async function createGroup(
    templateId: string,
    payload: GroupCreate
): Promise<Group> {
    const res = await api.post<{ group: Group }, GroupCreate>(
        `/api/v1/admin/interview/templates/${templateId}/groups`,
        payload
    );
    return res.group;
}

export async function updateGroup(
    templateId: string,
    groupId: string,
    payload: GroupUpdate
): Promise<Group> {
    const res = await api.patch<{ group: Group }, GroupUpdate>(
        `/api/v1/admin/interview/templates/${templateId}/groups/${groupId}`,
        payload
    );
    return res.group;
}

export async function deleteGroup(
    templateId: string,
    groupId: string,
    hard: boolean = false
): Promise<{ id: string; message: string }> {
    return await api.request({
        method: "DELETE",
        endpoint: `/api/v1/admin/interview/templates/${templateId}/groups/${groupId}`,
        body: { hard },
    });
}

// ============================================================================
// Field APIs (Section Fields)
// ============================================================================

export async function createSectionField(
    templateId: string,
    sectionId: string,
    payload: FieldCreate
): Promise<Field> {
    const res = await api.post<{ field: Field }, FieldCreate>(
        `/api/v1/admin/interview/templates/${templateId}/sections/${sectionId}/fields`,
        payload
    );
    return res.field;
}

export async function listSectionFields(
    templateId: string,
    sectionId: string,
    params?: ListParams
): Promise<{ fields: Field[] }> {
    const response = await api.get<{ items: Field[]; count: number }>(
        `/api/v1/admin/interview/templates/${templateId}/sections/${sectionId}/fields`,
        {
            query: params as Record<string, string | number | boolean | undefined>,
        }
    );
    return { fields: response.items || [] };
}

// ============================================================================
// Field APIs (Group Fields)
// ============================================================================

export async function createGroupField(
    templateId: string,
    groupId: string,
    payload: FieldCreate
): Promise<Field> {
    const res = await api.post<{ field: Field }, FieldCreate>(
        `/api/v1/admin/interview/templates/${templateId}/groups/${groupId}/fields`,
        payload
    );
    return res.field;
}

export async function listGroupFields(
    templateId: string,
    groupId: string,
    params?: ListParams
): Promise<{ fields: Field[] }> {
    const response = await api.get<{ items: Field[]; count: number }>(
        `/api/v1/admin/interview/templates/${templateId}/groups/${groupId}/fields`,
        {
            query: params as Record<string, string | number | boolean | undefined>,
        }
    );
    return { fields: response.items || [] };
}

// ============================================================================
// Field APIs (Get/Update/Delete)
// ============================================================================

export async function getFieldById(
    templateId: string,
    fieldId: string
): Promise<Field> {
    const res = await api.get<{ field: Field }>(
        `/api/v1/admin/interview/templates/${templateId}/fields/${fieldId}`
    );
    return res.field;
}

export async function updateField(
    templateId: string,
    fieldId: string,
    payload: FieldUpdate
): Promise<Field> {
    const res = await api.patch<{ field: Field }, FieldUpdate>(
        `/api/v1/admin/interview/templates/${templateId}/fields/${fieldId}`,
        payload
    );
    return res.field;
}

export async function deleteField(
    templateId: string,
    fieldId: string,
    hard: boolean = false
): Promise<{ id: string; message: string }> {
    return await api.request({
        method: "DELETE",
        endpoint: `/api/v1/admin/interview/templates/${templateId}/fields/${fieldId}`,
        body: { hard },
    });
}

// ============================================================================
// Field Option APIs
// ============================================================================

export async function createFieldOption(
    templateId: string,
    fieldId: string,
    payload: FieldOptionCreate
): Promise<FieldOption> {
    const res = await api.post<{ option: FieldOption }, FieldOptionCreate>(
        `/api/v1/admin/interview/templates/${templateId}/fields/${fieldId}/options`,
        payload
    );
    return res.option;
}

export async function listFieldOptions(
    templateId: string,
    fieldId: string,
    params?: ListParams
): Promise<{ options: FieldOption[] }> {
    const response = await api.get<{ items: FieldOption[]; count: number }>(
        `/api/v1/admin/interview/templates/${templateId}/fields/${fieldId}/options`,
        {
            query: params as Record<string, string | number | boolean | undefined>,
        }
    );
    return { options: response.items || [] };
}

export async function getFieldOptionById(
    templateId: string,
    fieldId: string,
    optionId: string
): Promise<FieldOption> {
    const res = await api.get<{ option: FieldOption }>(
        `/api/v1/admin/interview/templates/${templateId}/fields/${fieldId}/options/${optionId}`
    );
    return res.option;
}

export async function updateFieldOption(
    templateId: string,
    fieldId: string,
    optionId: string,
    payload: FieldOptionUpdate
): Promise<FieldOption> {
    const res = await api.patch<{ option: FieldOption }, FieldOptionUpdate>(
        `/api/v1/admin/interview/templates/${templateId}/fields/${fieldId}/options/${optionId}`,
        payload
    );
    return res.option;
}

export async function deleteFieldOption(
    templateId: string,
    fieldId: string,
    optionId: string,
    hard: boolean = false
): Promise<{ id: string; message: string }> {
    return await api.request({
        method: "DELETE",
        endpoint: `/api/v1/admin/interview/templates/${templateId}/fields/${fieldId}/options/${optionId}`,
        body: { hard },
    });
}