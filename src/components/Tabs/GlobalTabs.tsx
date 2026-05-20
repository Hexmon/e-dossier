"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";
import CourseSelectModal from "@/components/modals/CourseSelectModal";
import { cn } from "@/lib/utils";
import { useSetupStatus } from "@/hooks/useSetupStatus";

type TabItem = {
  value: string;
  title: string;
  icon?: React.ElementType;
  link?: string;
  action?: "offerings";
};

interface GlobalTabsProps {
  tabs: TabItem[];
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

const SETUP_RETURN_TO = "/setup";

const SETUP_ALLOWED_TAB_PATHS = [
  "/dashboard/genmgmt/platoon-management",
  "/dashboard/genmgmt/usersmgmt",
  "/dashboard/genmgmt/appointmentmgmt",
  "/dashboard/genmgmt/hierarchy",
  "/dashboard/genmgmt/coursemgmt",
  "/dashboard/genmgmt/subjectmgmt",
  "/dashboard/genmgmt/ocmgmt",
  "/dashboard/help/setup-guide",
];

function pathAllowsSetupNavigation(path: string) {
  return SETUP_ALLOWED_TAB_PATHS.some(
    (allowedPath) => path === allowedPath || path.startsWith(`${allowedPath}/`)
  );
}

function buildSetupHref(path: string) {
  const [pathname, queryString = ""] = path.split("?");
  const params = new URLSearchParams(queryString);
  params.set("returnTo", SETUP_RETURN_TO);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function shouldShowSetupTab(tab: TabItem) {
  if (tab.action === "offerings") {
    return true;
  }

  if (!tab.link) {
    return true;
  }

  return pathAllowsSetupNavigation(tab.link.split("?")[0]);
}

export default function GlobalTabs({
  tabs,
  defaultValue,
  value,
  onValueChange,
  children,
}: GlobalTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [offeringsOpen, setOfferingsOpen] = useState(false);
  const setupStatusQuery = useSetupStatus();
  const setupMode =
    searchParams.get("returnTo") === SETUP_RETURN_TO ||
    setupStatusQuery.data?.setupComplete === false;
  const isControlled = typeof value === "string";
  const visibleTabs = setupMode ? tabs.filter(shouldShowSetupTab) : tabs;

  const hasOfferingsAction = visibleTabs.some((tab) => tab.action === "offerings");
  const isOfferingsPage =
    pathname.includes("/dashboard/genmgmt/coursemgmt/") && pathname.includes("/offerings");
  const sharedTabBaseClasses =
    "flex items-center gap-2 border border-border " +
    "rounded-md px-3 py-2 transition-colors w-full shrink min-w-0 truncate";
  const sharedTabClasses =
    sharedTabBaseClasses +
    "data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground " +
    "data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:border-primary ";

  return (
    <Tabs
      {...(isControlled
        ? { value, onValueChange }
        : { defaultValue })}
      className="space-y-6"
    >
      <TabsList
        className="grid w-full sticky top-16 z-40"
        style={{ gridTemplateColumns: `repeat(${Math.max(visibleTabs.length, 1)}, minmax(0, 1fr))` }}
      >
        {visibleTabs.map(({ value, title, icon: Icon, link, action }) =>
          action === "offerings" ? (
            <button
              key={value}
              type="button"
              onClick={() => setOfferingsOpen(true)}
              className={cn(
                "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center hover:text-primary",
                sharedTabBaseClasses,
                isOfferingsPage
                  ? "bg-background border-primary text-primary shadow-sm"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
              <span className="truncate">{title}</span>
            </button>
          ) : link ? (
            <Link
              key={value}
              href={setupMode ? buildSetupHref(link) : link}
              className="text-center hover:text-primary min-w-0"
            >
              <TabsTrigger
                value={value}
                className={sharedTabClasses}
              >
                {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                <span className="truncate">{title}</span>
              </TabsTrigger>
            </Link>
          ) : (
            <TabsTrigger
              key={value}
              value={value}
              className={sharedTabClasses}
            >
              {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
              <span className="truncate">{title}</span>
            </TabsTrigger>
          )
        )}
      </TabsList>

      {/* Inject page-specific content */}
      {children}

      {hasOfferingsAction && (
        <CourseSelectModal
          open={offeringsOpen}
          onOpenChange={setOfferingsOpen}
          onSelect={(course) =>
            router.push(
              setupMode
                ? buildSetupHref(`/dashboard/genmgmt/coursemgmt/${course.id}/offerings`)
                : `/dashboard/genmgmt/coursemgmt/${course.id}/offerings`
            )
          }
        />
      )}
    </Tabs>
  );
}
