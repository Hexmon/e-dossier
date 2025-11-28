export interface OlqSubtitle {
    id: string;
    name: string;
}

export type OlqStructure = Record<string, OlqSubtitle[]>;

export interface OlqScore {
    subtitleId: string;
    marksScored: number | null;
}

export interface OlqFormValues {
    [key: string]: any;
}
