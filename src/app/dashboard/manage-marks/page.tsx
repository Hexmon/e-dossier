"use client";

import ManageMarksPageContent from "@/components/academics/ManageMarksPageContent";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function ManageMarksPage() {
    return (
        <DashboardLayout
            title="Academics Management"
            description="Subject-wise marks entry"
        >
            <main className="p-6">
                <ManageMarksPageContent />
            </main>
        </DashboardLayout>
    );
}
