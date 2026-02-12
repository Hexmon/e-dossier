import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import DeviceSiteSettingsProvider from "@/components/providers/DeviceSiteSettingsProvider";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  return <DeviceSiteSettingsProvider>{children}</DeviceSiteSettingsProvider>;
}
