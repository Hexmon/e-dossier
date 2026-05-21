import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const navigationState = vi.hoisted(() => ({
  pathname: "/dashboard/genmgmt/platoon-management",
  searchParams: new URLSearchParams("returnTo=%2Fsetup"),
  push: vi.fn(),
  back: vi.fn(),
  useSetupStatus: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({
    push: navigationState.push,
    back: navigationState.back,
  }),
  useSearchParams: () => navigationState.searchParams,
}));

vi.mock("@/hooks/useSetupStatus", () => ({
  useSetupStatus: navigationState.useSetupStatus,
}));

vi.mock("@/components/modals/CourseSelectModal", () => ({
  default: () => null,
}));

import GlobalTabs from "@/components/Tabs/GlobalTabs";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { TabsContent } from "@/components/ui/tabs";

const setupTabs = [
  {
    value: "course-mgmt",
    title: "Course Management",
    link: "/dashboard/genmgmt/coursemgmt",
  },
  {
    value: "oc-mgmt",
    title: "OC Management",
    link: "/dashboard/genmgmt/ocmgmt",
  },
  {
    value: "platoon-management",
    title: "Platoon Management",
    link: "/dashboard/genmgmt/platoon-management",
  },
  {
    value: "user-mgmt",
    title: "User Management",
    link: "/dashboard/genmgmt/usersmgmt",
  },
  {
    value: "appointment-mgmt",
    title: "Appointment Management",
    link: "/dashboard/genmgmt/appointmentmgmt",
  },
  {
    value: "promotion-relegation",
    title: "Promotion / Relegation Management",
    link: "/dashboard/genmgmt/promotion-relegation",
  },
];

describe("setup navigation surfaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationState.pathname = "/dashboard/genmgmt/platoon-management";
    navigationState.searchParams = new URLSearchParams("returnTo=%2Fsetup");
    navigationState.useSetupStatus.mockReturnValue({
      data: { setupComplete: false },
      isLoading: false,
    });
  });

  it("filters dashboard tabs to setup-safe links while returning from setup", () => {
    const html = renderToStaticMarkup(
      <GlobalTabs tabs={setupTabs} defaultValue="course-mgmt">
        <TabsContent value="course-mgmt">Courses</TabsContent>
      </GlobalTabs>
    );

    expect(html).toContain("Course Management");
    expect(html).toContain("OC Management");
    expect(html).toContain("Platoon Management");
    expect(html).toContain("User Management");
    expect(html).toContain("Appointment Management");
    expect(html).toContain("href=\"/dashboard/genmgmt/coursemgmt?returnTo=%2Fsetup\"");
    expect(html).toContain("href=\"/dashboard/genmgmt/ocmgmt?returnTo=%2Fsetup\"");
    expect(html).toContain(
      "href=\"/dashboard/genmgmt/platoon-management?returnTo=%2Fsetup\""
    );
    expect(html).toContain("href=\"/dashboard/genmgmt/usersmgmt?returnTo=%2Fsetup\"");
    expect(html).toContain("href=\"/dashboard/genmgmt/appointmentmgmt?returnTo=%2Fsetup\"");
    expect(html).not.toContain("Promotion / Relegation Management");
    expect(html).not.toContain("href=\"/dashboard/genmgmt/promotion-relegation\"");
  });

  it("keeps normal dashboard tab links after setup is complete", () => {
    navigationState.searchParams = new URLSearchParams();
    navigationState.useSetupStatus.mockReturnValueOnce({
      data: { setupComplete: true },
      isLoading: false,
    });

    const html = renderToStaticMarkup(
      <GlobalTabs tabs={setupTabs} defaultValue="course-mgmt">
        <TabsContent value="course-mgmt">Courses</TabsContent>
      </GlobalTabs>
    );

    expect(html).toContain("User Management");
    expect(html).toContain("href=\"/dashboard/genmgmt/usersmgmt\"");
  });

  it("routes setup breadcrumbs back to setup instead of dashboard pages", () => {
    const html = renderToStaticMarkup(
      <BreadcrumbNav
        paths={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin Mgmt", href: "/dashboard/genmgmt" },
          { label: "Platoon Management" },
        ]}
      />
    );

    expect(html).toContain("href=\"/setup\"");
    expect(html).not.toContain("href=\"/dashboard\"");
    expect(html).not.toContain("href=\"/dashboard/genmgmt\"");
  });
});
