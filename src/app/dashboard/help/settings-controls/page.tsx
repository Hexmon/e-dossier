import DashboardLayout from '@/components/layout/DashboardLayout';
import { HelpMarkdownRenderer } from '@/components/help/HelpMarkdownRenderer';
import { loadHelpMarkdown } from '@/app/lib/help/help-loader';

export default async function SettingsControlsGuidePage() {
  const markdown = await loadHelpMarkdown('settings-controls.md');

  return (
    <DashboardLayout
      title="Settings Controls"
      description="Device settings, module access, workflow settings, dossier lock, ticker, and public content"
    >
      <main className="p-6">
        <div className="mx-auto max-w-5xl rounded-lg border bg-card p-6 shadow-sm">
          <HelpMarkdownRenderer markdown={markdown} />
        </div>
      </main>
    </DashboardLayout>
  );
}
