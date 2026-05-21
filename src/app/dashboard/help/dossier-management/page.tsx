import DashboardLayout from '@/components/layout/DashboardLayout';
import { HelpMarkdownRenderer } from '@/components/help/HelpMarkdownRenderer';
import { loadHelpMarkdown } from '@/app/lib/help/help-loader';

export default async function DossierManagementGuidePage() {
  const markdown = await loadHelpMarkdown('dossier-management.md');

  return (
    <DashboardLayout
      title="Dossier Management"
      description="OC-specific dossier, training, academics, assessment, and performance guide"
    >
      <main className="p-6">
        <div className="mx-auto max-w-5xl rounded-lg border bg-card p-6 shadow-sm">
          <HelpMarkdownRenderer markdown={markdown} />
        </div>
      </main>
    </DashboardLayout>
  );
}
