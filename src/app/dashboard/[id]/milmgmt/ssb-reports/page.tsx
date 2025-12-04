"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { useOcPersonal } from "@/hooks/useOcPersonal";
import { useSsbReport } from "@/hooks/useSsbReport";

import { SSBReportForm, SSBFormData } from "@/components/ssb/SSBReportForm";
import { reverseRatingMap } from "@/config/app.config";
import { toast } from "sonner";

export default function SsbReportsPage() {
    // ------------------------------
    // GET dynamic route param
    // ------------------------------
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    // ------------------------------
    // Load cadet details
    // ------------------------------
    const { cadet } = useOcPersonal(ocId);

    // ------------------------------
    // Load report
    // ------------------------------
    const { report, fetch, save } = useSsbReport(ocId);

    useEffect(() => {
        fetch();
    }, [fetch]);

    // ------------------------------
    // Save handler
    // ------------------------------
    const handleSave = async (data: SSBFormData) => {
        const payload = {
            positives: data.positiveTraits.map(p => ({
                note: p.trait ?? "",
                by: data.positiveBy ?? "",
            })),

            negatives: data.negativeTraits.map(n => ({
                note: n.trait ?? "",
                by: data.negativeBy ?? "",
            })),

            predictiveRating: reverseRatingMap[data.rating] ?? 0,
            scopeForImprovement: data.improvement ?? "",
        };

        const saved = await save(payload);

        if (saved) {
            toast.success("SSB Report Saved Successfully");
            fetch();
        }
    };

    return (
        <DashboardLayout
            title="SSB Report"
            description="Evaluate candidate's SSB performance and assessment."
        >
            <div className="p-6">

                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                        { label: "SSB Reports" },
                    ]}
                />

                {/* Cadet Table */}
                {cadet && (
                    <SelectedCadetTable
                        selectedCadet={{
                            name: cadet?.name ?? "",
                            ocId: cadet?.ocId ?? ocId,
                            ocNumber: cadet?.ocNumber ?? "",
                            courseName: cadet?.courseName ?? "",
                            course: cadet?.course ?? "",
                        }}
                    />
                )}

                {/* Form */}
                <div className="mt-6 max-w-5xl mx-auto">
                    <SSBReportForm
                        ocId={ocId}
                        report={report}
                        onSave={handleSave}
                    />
                </div>

            </div>
        </DashboardLayout>
    );
}
