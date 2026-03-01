import DashboardLayout from '@/components/layout/DashboardLayout';
import { HelpMarkdownRenderer } from '@/components/help/HelpMarkdownRenderer';
import { loadHelpMarkdown } from '@/app/lib/help/help-loader';

export default async function OrgTemplatesGuidePage() {
  const markdown = await loadHelpMarkdown('org-templates.md');

  return (
    <DashboardLayout
      title="Org Templates"
      description="Bootstrap default organization configuration using one command or one-click apply"
    >
      <main className="p-6">
        <div className="mx-auto max-w-5xl rounded-lg border bg-card p-6 shadow-sm">
          <HelpMarkdownRenderer markdown={markdown} />
        </div>
      </main>
    </DashboardLayout>
  );
}

