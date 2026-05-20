import DashboardLayout from '@/components/layout/DashboardLayout';
import { HelpMarkdownRenderer } from '@/components/help/HelpMarkdownRenderer';
import { loadHelpMarkdown } from '@/app/lib/help/help-loader';

export default async function SoftwareOverviewGuidePage() {
  const markdown = await loadHelpMarkdown('software-overview.md');

  return (
    <DashboardLayout
      title="Software Overview"
      description="Dashboard structure, setup gate, OC lifecycle, and module access overview"
    >
      <main className="p-6">
        <div className="mx-auto max-w-5xl rounded-lg border bg-card p-6 shadow-sm">
          <HelpMarkdownRenderer markdown={markdown} />
        </div>
      </main>
    </DashboardLayout>
  );
}
