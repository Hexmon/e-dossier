import DashboardLayout from '@/components/layout/DashboardLayout';
import { HelpMarkdownRenderer } from '@/components/help/HelpMarkdownRenderer';
import { loadHelpMarkdown } from '@/app/lib/help/help-loader';

export default async function SetupGuidePage() {
  const markdown = await loadHelpMarkdown('setup-guide.md');

  return (
    <DashboardLayout
      title="Setup Guide"
      description="First-time project setup for local development, data services, and RBAC seeding"
    >
      <main className="p-6">
        <div className="mx-auto max-w-5xl rounded-lg border bg-card p-6 shadow-sm">
          <HelpMarkdownRenderer markdown={markdown} />
        </div>
      </main>
    </DashboardLayout>
  );
}
