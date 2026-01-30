"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  HelpCircle,
  ChevronRight,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Image from "next/image";
import { MenuSection } from "@/types/appSidebar";
import { menuItems } from "@/constants/app.constants";
import { fetchMe, MeResponse } from "@/app/lib/api/me";
import OCSelectModal from "@/components/modals/OCSelectModal";
import { listAppointments } from "@/app/lib/api/AppointmentFilterApi";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();
  const router = useRouter();

  const [openGroups, setOpenGroups] = useState<string[]>(["Interview"]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const isActive = (path: string) => pathname === path;

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupName)
        ? prev.filter((g) => g !== groupName)
        : [...prev, groupName]
    );
  };

  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMeSafely = async (
    setData: (d: any) => void,
    setLoading: (v: boolean) => void,
    isMounted: () => boolean
  ) => {
    setLoading(true);

    try {
      const res = await fetchMe();
      if (isMounted()) {
        setData(res);
      }
    } catch (err) {
      console.error("Failed to load /me:", err);
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    const isMounted = () => mounted;

    loadMeSafely(setData, setLoading, isMounted);

    return () => {
      mounted = false;
    };
  }, []);

  const {
    user = {},
    roles = [],
    apt = {},
  } = (data ?? {}) as Partial<MeResponse>;

  const {
    id = "",
    position = "",
  } = apt as any;

  // Extract user ID from the data
  const userId = (user as any)?.id || "";

  // Check if user is admin by fetching their appointments
  useEffect(() => {
    if (!userId) {
      setCheckingAdmin(false);
      return;
    }

    const checkAdminStatus = async () => {
      setCheckingAdmin(true);
      try {
        const { appointments } = await listAppointments({ userId, active: true });

        // Get the first active appointment (or the most recent one)
        const activeAppointment = appointments.find(apt => !apt.endsAt) || appointments[0];

        if (activeAppointment) {
          // Check if positionName is "Admin" (case-insensitive)
          const positionName = activeAppointment.positionName || "";
          const normalizedPosition = positionName.toLowerCase();
          setIsAdmin(normalizedPosition === "admin" || normalizedPosition === "super admin");
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("Failed to check admin status:", err);
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [userId]);

  // Handle menu item click
  const handleMenuItemClick = (item: any, e: React.MouseEvent, section: MenuSection) => {
    // Check if this is the Dossier Management item
    if (item.title === "Dossier Management") {
      e.preventDefault();
      setModalOpen(true);
      return;
    }

    // Check if trying to access admin section without permissions
    if (section.group === "Admin Management" && !isAdmin) {
      e.preventDefault();
      return;
    }
  };

  // Determine if a section or item should be disabled
  const isDisabled = (section: MenuSection) => {
    return section.group === "Admin" && !isAdmin;
  };

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
                  <h3 className="font-semibold text-[#1677ff]">MCEME CTW</h3>
                  <p className="text-xs text-muted-foreground">Dashboard</p>
                </div>
              )}
            </div>
          </div>

          {/* User Role Badge */}
          {!collapsed && (
            <div className="p-4 border-b border-border">
              <Badge className="w-full justify-center bg-[#1677ff]">
                <Shield className="h-3 w-3 mr-1" />
                {position}
              </Badge>
            </div>
          )}

          {/* Navigation */}
          <div className="flex-1 p-2">
            <TooltipProvider>
              {menuItems.map((section) => {
                const disabled = isDisabled(section);

                return (
                  <SidebarGroup key={section.group}>
                    {section.collapsible ? (
                      <Collapsible
                        open={openGroups.includes(section.group)}
                        onOpenChange={() => !disabled && toggleGroup(section.group)}
                        disabled={disabled}
                      >
                        <CollapsibleTrigger asChild>
                          <SidebarGroupLabel
                            className={`flex items-center justify-between rounded-md p-2 ${disabled
                              ? "cursor-not-allowed opacity-50"
                              : "hover:bg-accent/50 cursor-pointer"
                              }`}
                          >
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                              {collapsed ? section.group.charAt(0) : section.group}
                              {disabled && !collapsed && <Lock className="h-3 w-3" />}
                            </span>
                            {!collapsed && !disabled && (
                              <ChevronRight
                                className={`h-3 w-3 transition-transform ${openGroups.includes(section.group) ? "rotate-90" : ""
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
                                  {disabled ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 px-2 py-1 rounded-md opacity-50 cursor-not-allowed">
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
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Admin access required</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <SidebarMenuButton asChild>
                                      <Link
                                        href={item.url}
                                        className={`flex items-center gap-2 px-2 py-1 rounded-md ${isActive(item.url)
                                          ? "bg-[#1677ff] text-white"
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
                                  )}
                                </SidebarMenuItem>
                              ))}
                            </SidebarMenu>
                          </SidebarGroupContent>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <>
                        {!collapsed && (
                          <SidebarGroupLabel
                            className={`text-xs font-medium text-muted-foreground flex items-center gap-2 ${disabled ? "opacity-50" : ""
                              }`}
                          >
                            {section.group}
                            {disabled && <Lock className="h-3 w-3" />}
                          </SidebarGroupLabel>
                        )}
                        <SidebarGroupContent>
                          <SidebarMenu>
                            {section.items.map((item) => (
                              <SidebarMenuItem key={item.title}>
                                {item.title === "Dossier Management" ? (
                                  <SidebarMenuButton
                                    onClick={(e) => handleMenuItemClick(item, e, section)}
                                    className={`flex items-center gap-2 ${isActive(item.url)
                                      ? "bg-[#1677ff] text-white"
                                      : ""
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
                                  </SidebarMenuButton>
                                ) : disabled ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2 px-2 py-1 rounded-md opacity-50 cursor-not-allowed">
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
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Admin access required</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <SidebarMenuButton asChild>
                                    <Link
                                      href={item.url}
                                      onClick={(e) => handleMenuItemClick(item, e, section)}
                                      className={`flex items-center gap-2 px-2 py-1 rounded-md ${isActive(item.url)
                                        ? "bg-[#1677ff] text-white"
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
                                )}
                              </SidebarMenuItem>
                            ))}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </>
                    )}
                  </SidebarGroup>
                );
              })}
            </TooltipProvider>
          </div>

          {/* Help Section */}
          {/* <div className="p-2 border-t border-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/dashboard/help"
                    className={`flex items-center gap-2 px-2 py-1 rounded-md ${isActive("/dashboard/help")
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
          </div> */}
        </SidebarContent>
      </Sidebar>

      {/* OC Select Modal - Pass userId to filter by platoon */}
      <OCSelectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelect={(oc) => router.push(`/dashboard/${oc.id}/milmgmt`)}
        userId={userId}
      />
    </>
  );
}