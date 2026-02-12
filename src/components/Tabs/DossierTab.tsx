"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, Shield } from "lucide-react";
import { useState, useMemo } from "react";
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
  ocId: string;
}

export default function DossierTab({
  tabs,
  defaultValue,
  children,
  extraTabs: _extraTabs,
  nestedTabs,
  ocId,
}: DossierTabsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();

  // Determine current page tab based on URL
  const currentPath = pathname.split("/").pop();
  const currentTab = tabs.find((tab) => tab.value === currentPath);
  const milTrgTab =
    tabs.find((tab) => tab.value === "mil-trg") ??
    ({
      value: "mil-trg",
      title: "Mil-Trg",
      icon: Shield,
    } as TabItem);

  // Only show two tabs -- current page + mil-trg
  const visibleTabs = useMemo(() => {
    if (currentTab && currentTab.value !== "mil-trg") return [currentTab, milTrgTab];
    const fallback = tabs.find((tab) => tab.value !== "mil-trg");
    return fallback ? [fallback, milTrgTab] : [milTrgTab];
  }, [currentTab, milTrgTab, tabs]);

  return (
    <Tabs defaultValue={defaultValue} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 sticky top-38 z-40">
        {visibleTabs.map(({ value, title, icon: Icon, link }) => {
          const isMilTrgTab = value === "mil-trg";
          const isMilTrgDropdown = isMilTrgTab;
          const showDropdown = isMilTrgTab;
          const isMilTrgActive = isMilTrgTab && (dropdownOpen || currentTab?.value === "mil-trg");
          const moduleInactiveOverride = isMilTrgActive && !isMilTrgTab;

          const TriggerContent = (
            <>
              {Icon && <Icon className="h-4 w-4" />}
              {title}
              {showDropdown && (
                <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
              )}

              {showDropdown && isMilTrgActive && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-96 rounded-md shadow-lg bg-white border max-h-64 overflow-y-auto">
                  {militaryTrainingCards.map(({ title, icon: Icon, color, to }) => {
                    const href = to(ocId);
                    return (
                      <Link
                        key={title}
                        href={href}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-primary/10 w-full"
                      >
                        <Icon className={`h-4 w-4 ${color}`} />
                        <span>{title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

            </>
          );

          if (isMilTrgDropdown) {
            return (
              <button
                key={value}
                type="button"
                className={`relative flex items-center justify-center gap-2 border border-border rounded-md px-3 py-2 transition-colors w-full min-w-0 truncate dropdown-tab-trigger ${isMilTrgActive ? "bg-white border-primary text-primary" : "bg-primary/10 text-primary"
                  }`}
                onClick={() => setDropdownOpen(true)}
              >
                {TriggerContent}
              </button>
            );
          }

          return link ? (
            <Link key={value} href={link} className="text-center hover:text-primary">
              <TabsTrigger
                value={value}
                className={`relative flex items-center gap-2 border border-border data-[state=inactive]:bg-primary/10 text-primary data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2 transition-colors w-full dropdown-tab-trigger ${moduleInactiveOverride ? "data-[state=active]:bg-primary/10 data-[state=active]:border-border" : ""
                  }`}
                onClick={() => setDropdownOpen(false)}
              >
                {TriggerContent}
              </TabsTrigger>
            </Link>
          ) : (
            <TabsTrigger
              key={value}
              value={value}
              className={`relative flex items-center gap-2 border border-border data-[state=inactive]:bg-primary/10 text-primary data-[state=active]:bg-white data-[state=active]:border-primary rounded-md px-3 py-2 transition-colors w-full dropdown-tab-trigger ${moduleInactiveOverride ? "data-[state=active]:bg-primary/10 data-[state=active]:border-border" : ""
                }`}
              onClick={() => setDropdownOpen(false)}
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
