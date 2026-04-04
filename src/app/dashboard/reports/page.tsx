'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { ReportsHub } from '@/components/reports/ReportsHub';

export default function ReportsPage() {
  return (
    <DashboardLayout
      title="Reports"
      description="Preview and download encrypted academic and military training reports"
    >
      <main className="p-6">
        <ReportsHub />
      </main>
    </DashboardLayout>
  );
}
