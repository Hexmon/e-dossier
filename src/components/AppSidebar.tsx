"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  HelpCircle,
  ChevronRight,

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
import { MenuSection } from "@/types/appSidebar";
import { menuItems } from "@/constants/app.constants";

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
            <Image
              src="/images/Military-College-Of-Electronics-Mechanical-Engineering.jpg"
              alt="MCEME Logo"
              width={8}
              height={8}
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
