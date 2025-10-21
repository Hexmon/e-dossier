"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Users,
  BookOpen,
  GraduationCap,
  Activity,
  Settings,
  Shield,
  HelpCircle,
  ChevronRight,
  UserCheck,
  Book,
  CalendarDays,
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

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

type MenuSection = {
  group: string;
  collapsible?: boolean;
  items: MenuItem[];
};

const menuItems:MenuSection[] = [
  {
    group: "Dashboard",
    items: [{ title: "Home", url: "/dashboard", icon: Home }],
  },
  {
    group: "Subject Management",
    items: [{ title: "Subjects", url: "/dashboard/subjects", icon: Book }],
  },
  {
    group: "Instructor Management",
    items: [{ title: "Instructors", url: "/dashboard/instructors", icon: GraduationCap }],
  },
  {
    group: "User Management",
    items: [{ title: "Users", url: "/dashboard/users", icon: Shield }],
  },
  {
    group: "Appointment Management",
    items: [{ title: "Appointments", url: "/dashboard/appointments", icon: CalendarDays }],
  },
  {
    group: "Assessment – NSA",
    items: [{ title: "OLQA", url: "/dashboard/olqa", icon: FileText }],
  },
  {
    group: "Overall OC Details",
    items: [{ title: "View All", url: "/dashboard/view-ocs", icon: Users }],
  },
  {
    group: "Academics",
    items: [{ title: "Coming Soon", url: "/dashboard/academics", icon: BookOpen, badge: "Soon" }],
  },
  {
    group: "Physical Training & Sports",
    items: [{ title: "Activities", url: "/dashboard/activities", icon: Activity }],
  },
  {
    group: "Interview",
    collapsible: true,
    items: [
      { title: "Platoon Cdr", url: "/dashboard/interview/platoon-cdr", icon: UserCheck },
      { title: "DS Coord", url: "/dashboard/interview/ds-coord", icon: UserCheck },
      { title: "CDR CTW", url: "/dashboard/interview/cdr-ctw", icon: UserCheck },
      { title: "DCCI", url: "/dashboard/interview/dcci", icon: UserCheck },
      { title: "Comdt", url: "/dashboard/interview/comdt", icon: UserCheck },
    ],
  },
  {
    group: "Report Management",
    items: [{ title: "Reports", url: "/dashboard/reports", icon: FileText }],
  },
  {
    group: "Site Settings",
    items: [{ title: "Configuration", url: "/dashboard/settings", icon: Settings }],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();

  const [openGroups, setOpenGroups] = useState<string[]>(["Interview"]);

  const isActive = (path: string) => pathname === path;

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupName)
        ? prev.filter((g) => g !== groupName)
        : [...prev, groupName]
    );
  };

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-card border-r border-border">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <img
              src="https://facultytick.com/wp-content/uploads/2022/03/Military-College-Of-Electronics-Mechanical-Engineering.jpg"
              alt="MCEME Logo"
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
            <Badge variant="secondary" className="w-full justify-center">
              <Shield className="h-3 w-3 mr-1" />
              Platoon Commander
            </Badge>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 p-2">
          {menuItems.map((section) => (
            <SidebarGroup key={section.group}>
              {section.collapsible ? (
                <Collapsible
                  open={openGroups.includes(section.group)}
                  onOpenChange={() => toggleGroup(section.group)}
                >
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="flex items-center justify-between hover:bg-accent/50 rounded-md p-2 cursor-pointer">
                      <span className="text-xs font-medium text-muted-foreground">
                        {collapsed ? section.group.charAt(0) : section.group}
                      </span>
                      {!collapsed && (
                        <ChevronRight
                          className={`h-3 w-3 transition-transform ${
                            openGroups.includes(section.group) ? "rotate-90" : ""
                          }`}
                        />
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {section.items.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild>
                              <Link
                                href={item.url}
                                className={`flex items-center gap-2 px-2 py-1 rounded-md ${
                                  isActive(item.url)
                                    ? "bg-accent text-primary"
                                    : "hover:bg-accent/50"
                                }`}
                              >
                                <item.icon className="h-4 w-4" />
                                {!collapsed && (
                                  <div className="flex items-center justify-between w-full">
                                    <span>{item.title}</span>
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
                      {section.group}
                    </SidebarGroupLabel>
                  )}
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <Link
                              href={item.url}
                              className={`flex items-center gap-2 px-2 py-1 rounded-md ${
                                isActive(item.url)
                                  ? "bg-accent text-primary"
                                  : "hover:bg-accent/50"
                              }`}
                            >
                              <item.icon className="h-4 w-4" />
                              {!collapsed && (
                                <div className="flex items-center justify-between w-full">
                                  <span>{item.title}</span>
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

        {/* Help Section */}
        <div className="p-2 border-t border-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link
                  href="/dashboard/help"
                  className={`flex items-center gap-2 px-2 py-1 rounded-md ${
                    isActive("/dashboard/help")
                      ? "bg-accent text-primary"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <HelpCircle className="h-4 w-4" />
                  {!collapsed && <span>Help / How-To</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
