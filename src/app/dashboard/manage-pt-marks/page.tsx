'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { PTBulkManagePageContent } from '@/components/physic-training/bulk/PTBulkManagePageContent';

export default function ManagePtMarksPage() {
    return (
        <DashboardLayout
            title="Physical Training Marks Management"
            description="Course-level bulk PT scores and motivation entry"
        >
            <main className="p-6">
                <PTBulkManagePageContent />
            </main>
        </DashboardLayout>
    );
}
