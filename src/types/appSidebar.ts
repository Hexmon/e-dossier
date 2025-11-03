export type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

export type MenuSection = {
  group: string;
  collapsible?: boolean;
  items: MenuItem[];
};