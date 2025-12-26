"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

type TabItem = {
  value: string;
  title: string;
  icon?: React.ElementType;
  link?: string;
};

interface GlobalTabsProps {
  tabs: TabItem[];
  defaultValue: string;
  children: React.ReactNode;
}

export default function GlobalTabs({
  tabs,
  defaultValue,
  children,
}: GlobalTabsProps) {
  return (
    <Tabs defaultValue={defaultValue} className="space-y-6">
      <TabsList
        className="grid w-full sticky top-16 z-40"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(({ value, title, icon: Icon, link }) =>
          link ? (
            <Link key={value} href={link} className="text-center hover:text-primary min-w-0">
              <TabsTrigger
                value={value}
                className="flex items-center gap-2 border border-gray-300 
                data-[state=inactive]:bg-blue-100 text-[#1677ff] 
                data-[state=active]:bg-white data-[state=active]:border-primary 
                rounded-md px-3 py-2 transition-colors w-full shrink min-w-0 truncate"
              >
                {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                <span className="truncate">{title}</span>
              </TabsTrigger>
            </Link>
          ) : (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-2 border border-gray-300 
              data-[state=inactive]:bg-blue-100 text-blue-700 
              data-[state=active]:bg-white data-[state=active]:border-primary 
              rounded-md px-3 py-2 transition-colors w-full shrink min-w-0 truncate"
            >
              {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
              <span className="truncate">{title}</span>
            </TabsTrigger>
          )
        )}
      </TabsList>

      {/* Inject page-specific content */}
      {children}
    </Tabs>
  );
}
