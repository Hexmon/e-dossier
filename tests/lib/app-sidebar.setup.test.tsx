import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const navState = vi.hoisted(() => ({
  pathname: "/dashboard/genmgmt/platoon-management",
  searchParams: new URLSearchParams("returnTo=%2Fsetup"),
  useNavigation: vi.fn(),
  useSetupStatus: vi.fn(),
  useMe: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navState.pathname,
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => navState.searchParams,
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock("@/components/modals/OCSelectModal", () => ({
  default: () => null,
}));

vi.mock("@/hooks/useMe", () => ({
  useMe: navState.useMe,
}));

vi.mock("@/hooks/useSetupStatus", () => ({
  useSetupStatus: navState.useSetupStatus,
}));

vi.mock("@/hooks/useNavigation", () => ({
  useNavigation: navState.useNavigation,
}));

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

function renderSidebar() {
  return renderToStaticMarkup(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>
  );
}

describe("AppSidebar setup mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navState.pathname = "/dashboard/genmgmt/platoon-management";
    navState.searchParams = new URLSearchParams("returnTo=%2Fsetup");
    navState.useMe.mockReturnValue({
      data: {
        apt: { position: "ADMIN" },
        user: { id: "admin-1" },
      },
    });
    navState.useSetupStatus.mockReturnValue({
      data: { setupComplete: false },
      isLoading: false,
    });
    navState.useNavigation.mockReturnValue({
      data: {
        sections: [
          {
            key: "reports",
            label: "Reports",
            items: [{ key: "reports", label: "Reports", url: "/dashboard/reports", icon: "FileText" }],
          },
        ],
      },
      isLoading: false,
      error: null,
    });
  });

  it("renders setup-only navigation when returning from setup", () => {
    const html = renderSidebar();

    expect(html).toContain("Setup Only");
    expect(html).toContain("Setup Checklist");
    expect(html).toContain("Platoons");
    expect(html).toContain("Users");
    expect(html).toContain("Appointments");
    expect(html).toContain("href=\"/setup\"");
    expect(html).toContain("returnTo=%2Fsetup");
    expect(html).not.toContain("href=\"/dashboard/reports\"");
    expect(navState.useNavigation).toHaveBeenCalledWith({ enabled: false });
  });

  it("renders normal dashboard navigation after setup is complete", () => {
    navState.searchParams = new URLSearchParams();
    navState.useSetupStatus.mockReturnValueOnce({
      data: { setupComplete: true },
      isLoading: false,
    });

    const html = renderSidebar();

    expect(html).not.toContain("Setup Only");
    expect(html).toContain("href=\"/dashboard/reports\"");
    expect(navState.useNavigation).toHaveBeenCalledWith({ enabled: true });
  });

  it("restores cadet appointments under settings for eligible platoon commanders", () => {
    navState.searchParams = new URLSearchParams();
    navState.useMe.mockReturnValueOnce({
      data: {
        apt: { position: "ARJUNPLCDR" },
        user: { id: "pl-cdr-1" },
        cadetAppointments: { canManage: true },
      },
    });
    navState.useSetupStatus.mockReturnValueOnce({
      data: { setupComplete: true },
      isLoading: false,
    });
    navState.useNavigation.mockReturnValueOnce({
      data: {
        sections: [
          {
            key: "dashboard",
            label: "Dashboard",
            items: [{ key: "home", label: "Home", url: "/dashboard", icon: "Home" }],
          },
          {
            key: "reports",
            label: "Reports",
            items: [{ key: "reports", label: "Reports", url: "/dashboard/reports", icon: "FileText" }],
          },
          {
            key: "help",
            label: "Help",
            items: [{ key: "help", label: "Help", url: "/dashboard/help", icon: "LifeBuoy" }],
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    const html = renderSidebar();

    expect(html).toContain("Settings");
    expect(html).toContain("Cadet Appointments");
    expect(html).toContain("href=\"/dashboard/settings/device/appointments\"");
    expect(html).not.toContain("Device Site Settings");
  });
});
