"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import CourseSelectModal from "@/components/modals/CourseSelectModal";

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

export default function GlobalTabs({
  tabs,
  defaultValue,
  value,
  onValueChange,
  children,
}: GlobalTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [offeringsOpen, setOfferingsOpen] = useState(false);
  const isControlled = typeof value === "string";

  const hasOfferingsAction = tabs.some((tab) => tab.action === "offerings");
  const isOfferingsPage =
    pathname.includes("/dashboard/genmgmt/coursemgmt/") && pathname.includes("/offerings");

  return (
    <Tabs
      {...(isControlled
        ? { value, onValueChange }
        : { defaultValue })}
      className="space-y-6"
    >
      <TabsList
        className="grid w-full sticky top-16 z-40"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(({ value, title, icon: Icon, link, action }) =>
          action === "offerings" ? (
            <button
              key={value}
              type="button"
              onClick={() => setOfferingsOpen(true)}
              className={`inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-2 border border-gray-300 
              rounded-md px-3 py-2 transition-colors w-full shrink min-w-0 truncate hover:text-primary ${
                isOfferingsPage ? "bg-white border-primary text-blue-700" : "bg-blue-100 text-blue-700"
              }`}
            >
              {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
              <span className="truncate">{title}</span>
            </button>
          ) : link ? (
            <Link key={value} href={link} className="text-center hover:text-primary min-w-0">
              <TabsTrigger
                value={value}
                className="flex items-center gap-2 border border-border 
                data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground 
                data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:border-primary 
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
              className="flex items-center gap-2 border border-border 
              data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground 
              data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:border-primary 
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

      {hasOfferingsAction && (
        <CourseSelectModal
          open={offeringsOpen}
          onOpenChange={setOfferingsOpen}
          onSelect={(course) =>
            router.push(`/dashboard/genmgmt/coursemgmt/${course.id}/offerings`)
          }
        />
      )}
    </Tabs>
  );
}
