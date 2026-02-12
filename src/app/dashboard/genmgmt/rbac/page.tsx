"use client";

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { PageHeader } from '@/components/layout/PageHeader';
import BreadcrumbNav from '@/components/layout/BreadcrumbNav';
import RbacManagement from '@/components/genmgmt/rbac/RbacManagement';
import { useMe } from '@/hooks/useMe';
import { resolvePageAction } from '@/app/lib/acx/action-map';
import { isAuthzV2Enabled } from '@/app/lib/acx/feature-flag';

export default function RbacManagementPage() {
  const router = useRouter();
  const { data: meData, isLoading: meLoading } = useMe();
  const authzV2Enabled = isAuthzV2Enabled();

  const hasPageAccess = useMemo(() => {
    if (!authzV2Enabled) return true;
    if (meLoading) return true;

    const page = resolvePageAction('/dashboard/genmgmt/rbac');
    if (!page) return true;

    const roles = (meData?.roles ?? []).map((role) => String(role).toUpperCase());
    const permissions = new Set<string>((meData?.permissions ?? []) as string[]);

    if (roles.includes('SUPER_ADMIN')) return true;
    if (roles.includes('ADMIN') && page.adminBaseline) return true;
    if (permissions.has('*')) return true;
    return permissions.has(page.action);
  }, [authzV2Enabled, meData?.permissions, meData?.roles, meLoading]);

  useEffect(() => {
    if (!authzV2Enabled || meLoading) return;
    if (!hasPageAccess) {
      router.replace('/dashboard');
    }
  }, [authzV2Enabled, hasPageAccess, meLoading, router]);

  if (authzV2Enabled && !meLoading && !hasPageAccess) {
    return null;
  }

  return (
    <SidebarProvider>
      <section className="flex min-h-screen w-full">
        <AppSidebar />

        <main className="flex-1 flex flex-col">
          <PageHeader title="RBAC Management" description="Manage actions, mappings, and field-level rules" />

          <section className="p-6 flex-1 space-y-6">
            <BreadcrumbNav
              paths={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Gen Mgmt', href: '/dashboard/genmgmt' },
                { label: 'RBAC Management' },
              ]}
            />

            <RbacManagement />
          </section>
        </main>
      </section>
    </SidebarProvider>
  );
}
