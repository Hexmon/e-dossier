import DashboardLayout from '@/components/layout/DashboardLayout';
import { HelpMarkdownRenderer } from '@/components/help/HelpMarkdownRenderer';
import { loadHelpMarkdown } from '@/app/lib/help/help-loader';

export default async function ModuleManagementGuidePage() {
  const markdown = await loadHelpMarkdown('module-management.md');

  return (
    <DashboardLayout
      title="Module Management"
      description="Academics, grading, camps, punishments, interviews, PT, OLQ, templates, and workflow settings"
    >
      <main className="p-6">
        <div className="mx-auto max-w-5xl rounded-lg border bg-card p-6 shadow-sm">
          <HelpMarkdownRenderer markdown={markdown} />
        </div>
      </main>
    </DashboardLayout>
  );
}
