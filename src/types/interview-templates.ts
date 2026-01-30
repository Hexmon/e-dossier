export type TemplateFieldOption = {
    id: string;
    code: string;
    label: string;
    sortOrder: number;
};

export type TemplateField = {
    id: string;
    key: string;
    label: string;
    fieldType: string;
    groupId?: string | null;
    required?: boolean;
    helpText?: string | null;
    sortOrder?: number;
    captureFiledAt?: boolean;
    captureSignature?: boolean;
    options?: TemplateFieldOption[];
};

export type TemplateSection = {
    id: string;
    title: string;
    description?: string | null;
    sortOrder?: number;
    fields: TemplateField[];
};

export type TemplateGroup = {
    id: string;
    title?: string | null;
    minRows?: number;
    maxRows?: number | null;
    fields: TemplateField[];
    fieldsByKey: Map<string, TemplateField>;
};

export type TemplateInfo = {
    id: string;
    code: string;
    title: string;
    sortOrder?: number;
    semesters?: number[];
    allowMultiple?: boolean;
    sections: TemplateSection[];
    fieldsByKey: Map<string, TemplateField>;
    fieldsById: Map<string, TemplateField>;
    groups: TemplateGroup[];
};
