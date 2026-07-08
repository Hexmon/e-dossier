"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  ChevronRight,
  Home,
  Book,
  NotebookPen,
  FileText,
  BookOpen,
  Settings,
  Users,
  Activity,
  UserCheck,
  CalendarDays,
  Lock,
  ArrowDownUp,
  Dumbbell,
  LifeBuoy,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useMe } from "@/hooks/useMe";
import OCSelectModal from "@/components/modals/OCSelectModal";
import { useNavigation, type NavItem, type NavSection } from "@/hooks/useNavigation";
import { useSetupStatus } from "@/hooks/useSetupStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { buildCurrentDossierRoot, isDossierManagementRoute } from "@/lib/dossier-route";

// Map string icon keys to Lucide components
const ICON_MAP: Record<string, any> = {
  Home,
  Book,
  NotebookPen,
  FileText,
  BookOpen,
  Settings,
  Users,
  Activity,
  UserCheck,
  CalendarDays,
  ArrowDownUp,
  Dumbbell,
  LifeBuoy,
};

const SETUP_RETURN_TO = "/setup";
const CADET_APPOINTMENTS_ITEM = {
  key: "cadet_appointments",
  label: "Cadet Appointments",
  url: "/dashboard/settings/device/appointments",
  icon: "CalendarDays",
};

const SETUP_DASHBOARD_PATHS = [
  "/dashboard/genmgmt/platoon-management",
  "/dashboard/genmgmt/usersmgmt",
  "/dashboard/genmgmt/appointmentmgmt",
  "/dashboard/genmgmt/hierarchy",
  "/dashboard/genmgmt/coursemgmt",
  "/dashboard/genmgmt/subjectmgmt",
  "/dashboard/genmgmt/ocmgmt",
  "/dashboard/help/setup-guide",
];

const SETUP_SIDEBAR_ITEMS = [
  { key: "setup", label: "Setup Checklist", url: "/setup", icon: "Home", exact: true },
  {
    key: "setup-platoons",
    label: "Platoons",
    url: buildSetupReturnHref("/dashboard/genmgmt/platoon-management"),
    icon: "Users",
  },
  {
    key: "setup-users",
    label: "Users",
    url: buildSetupReturnHref("/dashboard/genmgmt/usersmgmt"),
    icon: "Users",
  },
  {
    key: "setup-appointments",
    label: "Appointments",
    url: buildSetupReturnHref("/dashboard/genmgmt/appointmentmgmt"),
    icon: "UserCheck",
  },
  {
    key: "setup-hierarchy",
    label: "Hierarchy",
    url: buildSetupReturnHref("/dashboard/genmgmt/hierarchy"),
    icon: "Activity",
  },
  {
    key: "setup-courses",
    label: "Courses",
    url: buildSetupReturnHref("/dashboard/genmgmt/coursemgmt"),
    icon: "BookOpen",
  },
  {
    key: "setup-subjects",
    label: "Subjects",
    url: buildSetupReturnHref("/dashboard/genmgmt/subjectmgmt"),
    icon: "NotebookPen",
  },
  {
    key: "setup-ocs",
    label: "Officer Cadets",
    url: buildSetupReturnHref("/dashboard/genmgmt/ocmgmt"),
    icon: "UserCheck",
  },
  {
    key: "setup-guide",
    label: "Setup Guide",
    url: buildSetupReturnHref("/dashboard/help/setup-guide"),
    icon: "LifeBuoy",
  },
];

function buildSetupReturnHref(pathname: string) {
  const params = new URLSearchParams();
  params.set("returnTo", SETUP_RETURN_TO);
  return `${pathname}?${params.toString()}`;
}

function isSetupDashboardPath(pathname: string | null) {
  return Boolean(
    pathname &&
      SETUP_DASHBOARD_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
      )
  );
}

function getSetupItemActive(pathname: string | null, item: (typeof SETUP_SIDEBAR_ITEMS)[number]) {
  if (!pathname) {
    return false;
  }

  if (item.exact) {
    return pathname === item.url;
  }

  const itemPath = item.url.split("?")[0];
  if (item.key === "setup-courses") {
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  }

  return pathname === itemPath;
}

function withCadetAppointmentsSidebarEntry(
  sections: NavSection[],
  canViewCadetAppointmentsSettings: boolean
): NavSection[] {
  if (!canViewCadetAppointmentsSettings) {
    return sections;
  }

  if (sections.some((section) => section.items.some((item) => item.key === CADET_APPOINTMENTS_ITEM.key))) {
    return sections;
  }

  let hadSettingsSection = false;
  const withExistingSettings = sections.map((section) => {
    if (section.key !== "settings") {
      return section;
    }

    hadSettingsSection = true;
    return {
      ...section,
      items: [...section.items, CADET_APPOINTMENTS_ITEM],
    };
  });

  if (hadSettingsSection) {
    return withExistingSettings;
  }

  const syntheticSettingsSection = {
    key: "settings",
    label: "Settings",
    items: [CADET_APPOINTMENTS_ITEM],
  };
  const helpIndex = sections.findIndex((section) => section.key === "help");
  if (helpIndex === -1) {
    return [...sections, syntheticSettingsSection];
  }

  return [
    ...sections.slice(0, helpIndex),
    syntheticSettingsSection,
    ...sections.slice(helpIndex),
  ];
}

function SetupOnlySidebar({
  collapsed,
  pathname,
  position,
}: {
  collapsed: boolean;
  pathname: string | null;
  position: string;
}) {
  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-card border-r border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Image
              src="/images/eme_logo.jpeg"
              alt="MCEME Logo"
              width={18}
              height={18}
              className="h-8 w-8 object-contain rounded"
            />
            {!collapsed && (
              <div>
                <h3 className="font-semibold text-primary">MCEME CTW</h3>
                <p className="text-xs text-muted-foreground">Initial Setup</p>
              </div>
            )}
          </div>
        </div>

        {!collapsed && (
          <div className="p-4 border-b border-border">
            <Badge className="w-full justify-center bg-primary text-primary-foreground">
              <Shield className="h-3 w-3 mr-1" />
              {position || "SETUP"}
            </Badge>
          </div>
        )}

        <div className="flex h-full flex-1 flex-col p-2">
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
                Setup Only
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {SETUP_SIDEBAR_ITEMS.map((item) => {
                  const IconComponent = ICON_MAP[item.icon] || Home;
                  const active = getSetupItemActive(pathname, item);
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton asChild>
                        <Link
                          href={item.url}
                          className={`flex items-center gap-2 px-[var(--density-sidebar-link-px)] py-[var(--density-sidebar-link-py)] rounded-md ${
                            active ? "bg-primary text-primary-foreground" : "hover:bg-accent/50"
                          }`}
                        >
                          <IconComponent className="h-4 w-4" />
                          {!collapsed && <span>{item.label}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {!collapsed ? (
            <div className="mt-auto border-t border-border p-3 text-xs text-muted-foreground">
              Complete the setup checklist before using the rest of the dashboard.
            </div>
          ) : null}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [openGroups, setOpenGroups] = useState<string[]>(["Interview"]);
  const [modalOpen, setModalOpen] = useState(false);

  const setupStatusQuery = useSetupStatus();
  const returnToSetup = searchParams.get("returnTo") === SETUP_RETURN_TO;
  const setupPath = isSetupDashboardPath(pathname);
  const setupIncomplete = setupStatusQuery.data?.setupComplete === false;
  const setupSidebarActive = returnToSetup || setupIncomplete;
  const waitingForSetupStatus = setupPath && !returnToSetup && !setupStatusQuery.data;

  const { data: meData } = useMe();
  const { data: navData, isLoading: navLoading, error: navError } = useNavigation({
    enabled: !setupSidebarActive && !waitingForSetupStatus,
  });

  // User info
  const { apt = {} } = meData ?? {};
  const { position = "" } = apt as any;
  const userId = (meData?.user as any)?.id || "";
  const isDossierRouteActive = isDossierManagementRoute(pathname);
  const canViewCadetAppointmentsSettings = meData?.cadetAppointments?.canManage === true;
  const visibleSections = withCadetAppointmentsSidebarEntry(
    navData?.sections ?? [],
    canViewCadetAppointmentsSettings
  );
  const mainSections = visibleSections.filter((section) => section.key !== "help");
  const pinnedSections = visibleSections.filter((section) => section.key === "help");

  const isItemActive = (item: NavItem) => {
    if (item.specialAction === "OPEN_OC_MODAL") return isDossierRouteActive;
    return pathname === item.url;
  };

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupName)
        ? prev.filter((g) => g !== groupName)
        : [...prev, groupName]
    );
  };

  const handleItemClick = (e: React.MouseEvent, item: NavItem) => {
    if (item.specialAction === "OPEN_OC_MODAL") {
      e.preventDefault();
      if (isDossierRouteActive) {
        const dossierRoot = buildCurrentDossierRoot(pathname);
        if (dossierRoot) {
          router.push(dossierRoot);
        }
        return;
      }
      setModalOpen(true);
    }
  };

  // Render Icon helper
  const renderIcon = (iconKey: string) => {
    const IconComponent = ICON_MAP[iconKey] || Home;
    return <IconComponent className="h-4 w-4" />;
  };

  if (setupSidebarActive) {
    return <SetupOnlySidebar collapsed={collapsed} pathname={pathname} position={position} />;
  }

  if (waitingForSetupStatus || navLoading) {
    return (
      <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
        <SidebarContent className="bg-card border-r border-border p-4 space-y-4">
          {/* Skeleton Loading State */}
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-8 w-8 rounded" />
            {!collapsed && <Skeleton className="h-8 w-32" />}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </SidebarContent>
      </Sidebar>
    );
  }

  if (navError) {
    return (
      <Sidebar className="w-64">
        <SidebarContent className="p-4">
          <div className="text-destructive flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span>Failed to load navigation</span>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <>
      <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
        <SidebarContent className="bg-card border-r border-border">
          {/* Logo */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Image
                src="/images/eme_logo.jpeg"
                alt="MCEME Logo"
                width={18}
                height={18}
                className="h-8 w-8 object-contain rounded"
              />
              {!collapsed && (
                <div>
                  <h3 className="font-semibold text-primary">MCEME CTW</h3>
                  <p className="text-xs text-muted-foreground">Dashboard</p>
                </div>
              )}
            </div>
          </div>

          {/* User Role Badge */}
          {!collapsed && (
            <div className="p-4 border-b border-border">
              <Badge className="w-full justify-center bg-primary text-primary-foreground">
                <Shield className="h-3 w-3 mr-1" />
                {position}
              </Badge>
            </div>
          )}

          {/* Navigation */}
          <div className="flex h-full flex-1 flex-col p-2">
            {mainSections.map((section) => (
              <SidebarGroup key={section.key}>
                {section.collapsible ? (
                  <Collapsible
                    open={openGroups.includes(section.key)}
                    onOpenChange={() => toggleGroup(section.key)}
                  >
                    <CollapsibleTrigger asChild>
                      <SidebarGroupLabel className="hover:bg-accent/50 cursor-pointer">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                          {collapsed ? section.label.charAt(0) : section.label}
                        </span>
                        {!collapsed && (
                          <ChevronRight
                            className={`h-3 w-3 ml-auto transition-transform ${openGroups.includes(section.key) ? "rotate-90" : ""}`}
                          />
                        )}
                      </SidebarGroupLabel>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {section.items.map((item) => (
                            <SidebarMenuItem key={item.key}>
                              <SidebarMenuButton asChild>
                                <Link
                                  href={item.url}
                                  onClick={(e) => handleItemClick(e, item)}
                                  className={`flex items-center gap-2 px-[var(--density-sidebar-link-px)] py-[var(--density-sidebar-link-py)] rounded-md ${isItemActive(item)
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-accent/50"
                                    }`}
                                >
                                  {renderIcon(item.icon)}
                                  {!collapsed && (
                                    <div className="flex items-center justify-between w-full">
                                      <span>{item.label}</span>
                                      {item.badge && (
                                        <Badge variant="outline" className="text-xs">
                                          {item.badge}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <>
                    {!collapsed && (
                      <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
                        {section.label}
                      </SidebarGroupLabel>
                    )}
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {section.items.map((item) => (
                          <SidebarMenuItem key={item.key}>
                            <SidebarMenuButton asChild>
                              <Link
                                href={item.url}
                                onClick={(e) => handleItemClick(e, item)}
                                className={`flex items-center gap-2 px-[var(--density-sidebar-link-px)] py-[var(--density-sidebar-link-py)] rounded-md ${isItemActive(item)
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-accent/50"
                                  }`}
                              >
                                {renderIcon(item.icon)}
                                {!collapsed && (
                                  <div className="flex items-center justify-between w-full">
                                    <span>{item.label}</span>
                                    {item.badge && (
                                      <Badge variant="outline" className="text-xs">
                                        {item.badge}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </>
                )}
              </SidebarGroup>
            ))}

            {pinnedSections.length > 0 ? (
              <div className="mt-auto border-t border-border pt-2">
                {pinnedSections.map((section) => (
                  <SidebarGroup key={section.key}>
                    {!collapsed && (
                      <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
                        {section.label}
                      </SidebarGroupLabel>
                    )}
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {section.items.map((item) => (
                          <SidebarMenuItem key={item.key}>
                            <SidebarMenuButton asChild>
                              <Link
                                href={item.url}
                                onClick={(e) => handleItemClick(e, item)}
                                className={`flex items-center gap-2 px-[var(--density-sidebar-link-px)] py-[var(--density-sidebar-link-py)] rounded-md ${
                                  isItemActive(item) ? "bg-primary text-primary-foreground" : "hover:bg-accent/50"
                                }`}
                              >
                                {renderIcon(item.icon)}
                                {!collapsed && (
                                  <div className="flex items-center justify-between w-full">
                                    <span>{item.label}</span>
                                    {item.badge && (
                                      <Badge variant="outline" className="text-xs">
                                        {item.badge}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                ))}
              </div>
            ) : null}
          </div>
        </SidebarContent>
      </Sidebar>

      <OCSelectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelect={(oc) => router.push(`/dashboard/${oc.id}/milmgmt`)}
        userId={userId}
      />
    </>
  );
}
