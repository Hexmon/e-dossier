"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { useNavigation, NavItem } from "@/hooks/useNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deriveSidebarRoleGroup,
  filterSidebarSectionsForRoleGroup,
} from "@/lib/sidebar-visibility";
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
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();
  const router = useRouter();

  const [openGroups, setOpenGroups] = useState<string[]>(["Interview"]);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: meData } = useMe();
  const { data: navData, isLoading: navLoading, error: navError } = useNavigation();

  // User info
  const { apt = {}, roles: meRoles = [] } = meData ?? {};
  const { position = "" } = apt as any;
  const userId = (meData?.user as any)?.id || "";
  const isDossierRouteActive = isDossierManagementRoute(pathname);
  const effectiveRoles = meRoles.length > 0 ? meRoles : navData?.userRoleSummary ?? [];
  const roleGroup = deriveSidebarRoleGroup({ roles: effectiveRoles, position });
  const visibleSections = filterSidebarSectionsForRoleGroup(navData?.sections ?? [], roleGroup);

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

  if (navLoading) {
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
          <div className="flex-1 p-2">
            {visibleSections.map((section) => (
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
