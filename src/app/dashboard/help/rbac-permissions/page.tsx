import DashboardLayout from '@/components/layout/DashboardLayout';
import { HelpMarkdownRenderer } from '@/components/help/HelpMarkdownRenderer';
import { loadHelpMarkdown } from '@/app/lib/help/help-loader';

export default async function RbacPermissionsGuidePage() {
  const markdown = await loadHelpMarkdown('rbac-permissions.md');

  return (
    <DashboardLayout
      title="RBAC & Permissions"
      description="Action map, roles, positions, appointment scope, field rules, and setup restrictions"
    >
      <main className="p-6">
        <div className="mx-auto max-w-5xl rounded-lg border bg-card p-6 shadow-sm">
          <HelpMarkdownRenderer markdown={markdown} />
        </div>
      </main>
    </DashboardLayout>
  );
}
