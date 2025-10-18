"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronDown } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { militaryTrainingCards } from "@/config/app.config";

type TabItem = {
  value: string;
  title: string;
  icon?: React.ElementType;
  link?: string;
  nestedTabs?: React.ReactNode;
};

interface DossierTabsProps {
  tabs: TabItem[];
  defaultValue: string;
  children: React.ReactNode;
  extraTabs?: React.ReactNode;
  nestedTabs?: React.ReactNode;
}

export default function DossierTab({
  tabs,
  defaultValue,
  children,
  extraTabs,
  nestedTabs,
}: DossierTabsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".dropdown-tab-trigger")) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine current page tab based on URL
  const currentPath = pathname.split("/").pop();
  const currentTab = tabs.find((tab) => tab.value === currentPath);
  const milTrgTab = tabs.find((tab) => tab.value === "mil-trg");

  // Only show two tabs — current page + mil-trg
  const visibleTabs = useMemo(() => {
    if (currentTab && milTrgTab) return [currentTab, milTrgTab];
    return tabs.slice(0, 2);
  }, [currentTab, milTrgTab, tabs]);

  return (
    <Tabs defaultValue={defaultValue} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 sticky top-36 z-40">
        {visibleTabs.map(({ value, title, icon: Icon, link }) => {
          const isMilTrgTab = title.toLowerCase() === "mil-trg";

          const TriggerContent = (
            <>
              {Icon && <Icon className="h-4 w-4" />}
              {title}
              {isMilTrgTab && extraTabs && (
                <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
              )}

              {isMilTrgTab && extraTabs && dropdownOpen && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-96 rounded-md shadow-lg bg-white border max-h-64 overflow-y-auto">
                  {militaryTrainingCards.map((card) => (
                    <Link
                      key={card.to}
                      href={card.to}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 w-full"
                    >
                      <card.icon className={`h-4 w-4 ${card.color}`} />
                      <span>{card.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          );

          const handleClick = (e: React.MouseEvent) => {
            if (isMilTrgTab && extraTabs) {
              e.preventDefault();
              setDropdownOpen((prev) => !prev);
            }
          };

          return link ? (
            <Link key={value} href={link} className="text-center hover:text-primary">
              <TabsTrigger
                value={value}
                className="relative flex items-center gap-2 border border-gray-300 data-[state=inactive]:bg-blue-100 text-blue-700 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2 transition-colors w-full dropdown-tab-trigger"
                onClick={handleClick}
              >
                {TriggerContent}
              </TabsTrigger>
            </Link>
          ) : (
            <TabsTrigger
              key={value}
              value={value}
              className="relative flex items-center gap-2 border border-gray-300 data-[state=inactive]:bg-blue-100 text-blue-700 data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2 transition-colors w-full dropdown-tab-trigger"
              onClick={handleClick}
            >
              {TriggerContent}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {children}

      {currentTab?.value !== "mil-trg" && nestedTabs && (
        <div className="mt-6">{nestedTabs}</div>
      )}
    </Tabs>
  );
}
