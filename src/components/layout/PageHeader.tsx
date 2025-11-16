"use client";

import { User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "../ui/sidebar";
import { useRouter } from "next/navigation";
import { logout } from "@/app/lib/api/authApi";
import { fetchMe, MeResponse } from "@/app/lib/api/me";
import { useEffect, useState } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {

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
    email = "",
    name = "",
    username = "",
    phone = "",
    rank = "",
  } = user as any;

  const {
    id = "",
    position ="",
  } = apt as any;

  const router = useRouter();

  const handleLogout = async () => {
    const ok = await logout();
    if (ok) {
      router.push("/login");
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 h-full">

        {/* Left side */}
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-8 w-8" />
          <div>
            <h1 className="text-lg font-semibold text-primary">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    PC
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{position}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {email}
                  </p>
                </div>
              </div>

              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
