import DashboardLayout from '@/components/layout/DashboardLayout';
import { HelpMarkdownRenderer } from '@/components/help/HelpMarkdownRenderer';
import { loadHelpMarkdown } from '@/app/lib/help/help-loader';

export default async function GradingPolicyGuidePage() {
  const markdown = await loadHelpMarkdown('grading-policy.md');

  return (
    <DashboardLayout
      title="Academic Grading Policy"
      description="Global grading bands, GPA formula settings, and recalculation workflow"
    >
      <main className="p-6">
        <div className="mx-auto max-w-5xl rounded-lg border bg-card p-6 shadow-sm">
          <HelpMarkdownRenderer markdown={markdown} />
        </div>
      </main>
    </DashboardLayout>
  );
}
