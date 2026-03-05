import DashboardLayout from '@/components/layout/DashboardLayout';
import { HelpHub } from '@/components/help/HelpHub';
import { buildHelpSearchEntries, getHelpCards } from '@/app/lib/help/help-index';

export default function HelpHubPage() {
  return (
    <DashboardLayout
      title="Help Center"
      description="User manual, setup instructions, and operational guidance"
    >
      <main className="p-6">
        <HelpHub cards={getHelpCards()} searchEntries={buildHelpSearchEntries()} />
      </main>
    </DashboardLayout>
  );
}
