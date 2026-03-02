export type HelpCardStatus = 'active' | 'coming_soon';

export type HelpDocumentSection = {
  anchor: string;
  label: string;
  keywords?: string[];
};

export type HelpModuleMeta = {
  key: string;
  title: string;
  summary: string;
  route: string;
  status: HelpCardStatus;
  tags?: string[];
  sections: HelpDocumentSection[];
};

export type HelpCard = {
  key: string;
  title: string;
  summary: string;
  route: string;
  status: HelpCardStatus;
  tags?: string[];
};

export type HelpSearchEntry = {
  id: string;
  type: 'card' | 'section';
  title: string;
  subtitle: string;
  href: string;
  keywords: string[];
};
