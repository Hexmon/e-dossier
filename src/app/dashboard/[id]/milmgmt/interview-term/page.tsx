"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import InterviewTermTabs from "@/components/interview-term/InterviewTermTabs";
import { useParams } from "next/navigation";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { useOcDetails } from "@/hooks/useOcDetails";

export default function InterviewTermPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    const { cadet } = useOcDetails(ocId);

    const {
        name = "",
        courseName = "",
        ocNumber = "",
        ocId: cadetOcId = ocId,
        course = "",
    } = cadet ?? {};

    const selectedCadet = { name, courseName, ocNumber, ocId: cadetOcId, course };

    return (
        <DashboardLayout title="Interview - Term" description="Term-wise interview forms">
            <main className="p-6">
                <BreadcrumbNav paths={[{ label: "Dashboard", href: "/dashboard" }, { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` }, { label: "Interview Term" }]} />

                {selectedCadet && (
                    <div className="hidden md:flex sticky top-16 z-40 mb-6">
                        <SelectedCadetTable selectedCadet={selectedCadet} />
                    </div>
                )}

                <InterviewTermTabs />
            </main>
        </DashboardLayout>
    );
}
