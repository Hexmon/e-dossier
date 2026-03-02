export type OlqDefaultTemplateSubtitle = {
  subtitle: string;
  maxMarks: number;
  displayOrder: number;
};

export type OlqDefaultTemplateCategory = {
  code: string;
  title: string;
  description: string | null;
  displayOrder: number;
  subtitles: OlqDefaultTemplateSubtitle[];
};

export type OlqDefaultTemplatePack = {
  version: string;
  categories: OlqDefaultTemplateCategory[];
};

export const OLQ_DEFAULT_TEMPLATE_PACK: OlqDefaultTemplatePack = {
  version: 'default.v1',
  categories: [
    {
      code: 'PLG_ORG',
      title: 'PLG & ORG',
      description: 'Planning and organizing qualities.',
      displayOrder: 1,
      subtitles: [
        { subtitle: 'Effective Intelligence', maxMarks: 20, displayOrder: 1 },
        { subtitle: 'Reasoning Ability', maxMarks: 20, displayOrder: 2 },
        { subtitle: 'Org Ability', maxMarks: 20, displayOrder: 3 },
        { subtitle: 'Power of Expression', maxMarks: 20, displayOrder: 4 },
      ],
    },
    {
      code: 'SOCIAL_ADJUSTMENT',
      title: 'Social Adjustment',
      description: 'Adjustment and social responsibility qualities.',
      displayOrder: 2,
      subtitles: [
        { subtitle: 'Social Adaptability', maxMarks: 20, displayOrder: 1 },
        { subtitle: 'Cooperation', maxMarks: 20, displayOrder: 2 },
        { subtitle: 'Sense of Responsibility', maxMarks: 20, displayOrder: 3 },
      ],
    },
    {
      code: 'SOCIAL_EFFECTIVENESS',
      title: 'Social Effectiveness',
      description: 'Leadership effectiveness in group settings.',
      displayOrder: 3,
      subtitles: [
        { subtitle: 'Initiative', maxMarks: 20, displayOrder: 1 },
        { subtitle: 'Self-Confidence', maxMarks: 20, displayOrder: 2 },
        { subtitle: 'Speed of Decision', maxMarks: 20, displayOrder: 3 },
        { subtitle: 'Ability to Influence the Gp', maxMarks: 20, displayOrder: 4 },
        { subtitle: 'Liveliness', maxMarks: 20, displayOrder: 5 },
      ],
    },
    {
      code: 'DYNAMIC',
      title: 'Dynamic',
      description: 'Drive, courage, and stamina qualities.',
      displayOrder: 4,
      subtitles: [
        { subtitle: 'Determination', maxMarks: 20, displayOrder: 1 },
        { subtitle: 'Courage', maxMarks: 20, displayOrder: 2 },
        { subtitle: 'Stamina', maxMarks: 20, displayOrder: 3 },
      ],
    },
  ],
};

export function getOlqDefaultTemplatePack(): OlqDefaultTemplatePack {
  return OLQ_DEFAULT_TEMPLATE_PACK;
}
