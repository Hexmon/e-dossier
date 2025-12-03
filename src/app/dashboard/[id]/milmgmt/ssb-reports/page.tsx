"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";
import { useSsbReport } from "@/hooks/useSsbReport";
import { SSBReportForm, SSBFormData } from "@/components/ssb/SSBReportForm";
import { reverseRatingMap } from "@/config/app.config";
import { toast } from "sonner";

export default function SsbReportsPage() {
    const params = useParams();
    const ocId = params.ocId as string;

    const { report, fetch, save } = useSsbReport(ocId);

    useEffect(() => {
        fetch();
    }, [fetch]);

    const handleSave = async (data: SSBFormData) => {
        const {
            positiveTraits,
            negativeTraits,
            positiveBy,
            negativeBy,
            rating,
            improvement
        } = data;

        const payload = {
            positives: positiveTraits.map(({ trait }) => ({
                note: trait || "",
                by: positiveBy || ""
            })),
            negatives: negativeTraits.map(({ trait }) => ({
                note: trait || "",
                by: negativeBy || ""
            })),
            predictiveRating: reverseRatingMap[rating] ?? 0,
            scopeForImprovement: improvement || ""
        };

        const result = await save(payload);

        if (result) {
            toast.success("SSB Report saved successfully!");
            fetch();
        }
    };

    return (
        <DashboardLayout
            title="SSB Report"
            description="Evaluate candidate's SSB performance and assessment"
        >
            <div className="p-6">

                <BreadcrumbNav
                    paths={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Dossier", href: `/dashboard/${ocId}/milmgmt` },
                        { label: "SSB Reports" }
                    ]}
                />

                <SelectedCadetTable ocId={ocId} />

                <div className="mt-6 max-w-4xl mx-auto">
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
