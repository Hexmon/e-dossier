"use client";

import { User, LogOut, Repeat } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "../ui/sidebar";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/app/lib/api/authApi";
import { useMe } from "@/hooks/useMe";
import SwitchUserModal from "@/components/auth/SwitchUserModal";
import OCSelectModal from "@/components/modals/OCSelectModal";
import { buildDossierPathForOc, extractDossierContext, isDossierManagementRoute } from "@/lib/dossier-route";

interface PageHeaderProps {
  title: string;
  description?: string;
  onLogout?: () => void;
}

const getInitials = (name: string): string => {
  if (!name || typeof name !== "string") return "PC";

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  const firstInitial = parts[0][0];
  const lastInitial = parts[parts.length - 1][0];
  return (firstInitial + lastInitial).toUpperCase();
};

export function PageHeader({ title, description, onLogout }: PageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [switchUserOpen, setSwitchUserOpen] = useState(false);
  const [switchOcOpen, setSwitchOcOpen] = useState(false);

  // Replaces the manual useEffect + fetchMe with a single React Query call
  // that's shared across the entire app
  const { data } = useMe();

  const {
    user = {},
    apt = {},
  } = data ?? {};

  const {
    email = "",
    name = "",
    id = "",
    username = "",
  } = user as any;

  const {
    id: appointmentId = "",
    position = "",
  } = apt as any;
  const isDossierRoute = isDossierManagementRoute(pathname);
  const dossierContext = extractDossierContext(pathname);

  const handleLogout = () => {
    // CRITICAL: Clear all React Query cache on logout
    // Without this, the next user will see cached data from the previous user
    queryClient.clear();

    if (onLogout) {
      onLogout();
      return;
    }

    // Navigate immediately for instant UX.
    // logout() clears localStorage and retries the API call (up to 3 times)
    // to ensure the httpOnly access_token cookie is cleared server-side.
    router.push("/login");
    logout().catch(() => {});
  };

  const initials = getInitials(name);

  return (
    <>
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
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 dark:hover:text-primary"
              onClick={() => setSwitchUserOpen(true)}
            >
              <Repeat className="h-4 w-4" />
              <span>Switch Account</span>
            </Button>
            {isDossierRoute && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="dark:hover:text-primary"
                onClick={() => setSwitchOcOpen(true)}
              >
                Switch OC
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {initials}
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
      <SwitchUserModal
        open={switchUserOpen}
        onOpenChange={setSwitchUserOpen}
        currentIdentity={{
          userId: id || null,
          appointmentId: appointmentId || null,
          roleKey: position || null,
          username: username || null,
        }}
      />
      <OCSelectModal
        open={switchOcOpen}
        onOpenChange={setSwitchOcOpen}
        disabledOcId={dossierContext?.ocId ?? null}
        userId={id || undefined}
        onSelect={(oc) => {
          setSwitchOcOpen(false);
          const targetPath = buildDossierPathForOc(oc.id, pathname, searchParams.toString());
          router.push(targetPath);
        }}
      />
    </>
  );
}
