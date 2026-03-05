import DashboardLayout from '@/components/layout/DashboardLayout';
import { HelpMarkdownRenderer } from '@/components/help/HelpMarkdownRenderer';
import { loadHelpMarkdown } from '@/app/lib/help/help-loader';

export default async function PhysicalTrainingTemplateGuidePage() {
  const markdown = await loadHelpMarkdown('physical-training-template.md');

  return (
    <DashboardLayout
      title="Physical Training Template"
      description="Default PT profile structure, apply behavior, and validation checklist"
    >
      <main className="p-6">
        <div className="mx-auto max-w-5xl rounded-lg border bg-card p-6 shadow-sm">
          <HelpMarkdownRenderer markdown={markdown} />
        </div>
      </main>
    </DashboardLayout>
  );
}

