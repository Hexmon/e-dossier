"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { useSsbReport } from "@/hooks/useSsbReport";

import { cloneSsbFormData, SSBReportForm, SSBFormData } from "@/components/ssb/SSBReportForm";
import { reverseRatingMap } from "@/config/app.config";
import { toast } from "sonner";
import type { RootState } from "@/store";
import { saveSsbForm, clearSsbForm } from "@/store/slices/ssbReportSlice";
import { fetchOCById } from "@/app/lib/api/ocApi";
import { fetchCourseById } from "@/app/lib/api/courseApi";
import type { Cadet } from "@/types/cadet";

export default function SsbReportsPage() {
    const { id } = useParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";
    const [cadet, setCadet] = useState<Cadet | null>(null);

    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.ssbReport.forms[ocId]
    );

    const { report, fetch, save } = useSsbReport(ocId);

    useEffect(() => {
        fetch();
    }, [ocId, fetch]);

    useEffect(() => {
        let cancelled = false;

        const loadCadet = async () => {
            if (!ocId) return;

            try {
                const oc = await fetchOCById(ocId);
                if (!oc || cancelled) return;

                const courseRes = await fetchCourseById(oc.course?.id || "");
                if (cancelled) return;

                setCadet({
                    name: oc.name ?? "",
                    course: oc.course?.id ?? "",
                    courseName: courseRes?.course?.code ?? "",
                    ocNumber: oc.ocNo ?? "",
                    ocId: oc.id ?? "",
                    currentSemester: oc.currentSemester ?? null,
                });
            } catch (err) {
                console.error("loadCadet error", err);
                if (!cancelled) {
                    toast.error("Failed to load cadet data");
                }
            }
        };

        void loadCadet();

        return () => {
            cancelled = true;
        };
    }, [ocId]);

    const handleSave = async (data: SSBFormData) => {
        console.log("Received form data:", data);

        // Filter out empty traits
        const filledPositiveTraits = data.positiveTraits.filter(
            p => p.trait && p.trait.trim() !== ""
        );

        const filledNegativeTraits = data.negativeTraits.filter(
            n => n.trait && n.trait.trim() !== ""
        );

        // CRITICAL FIX: Ensure positiveBy and negativeBy are never empty
        // If they're empty or undefined, use "Unknown" or similar default
        const positiveBy = (data.positiveBy && data.positiveBy.trim() !== "")
            ? data.positiveBy
            : "Staff";

        const negativeBy = (data.negativeBy && data.negativeBy.trim() !== "")
            ? data.negativeBy
            : "Staff";

        const payload = {
            positives: filledPositiveTraits.map(p => ({
                note: p.trait ?? "",
                by: positiveBy,
            })),

            negatives: filledNegativeTraits.map(n => ({
                note: n.trait ?? "",
                by: negativeBy,
            })),

            predictiveRating: reverseRatingMap[data.rating] ?? 0,
            scopeForImprovement: data.improvement ?? "",
        };

        console.log("Sending payload:", payload);

        const saved = await save(payload);

        if (saved) {
            dispatch(clearSsbForm(ocId));
            toast.success("SSB Report Saved Successfully");
        }
    };

    const handleClearForm = () => {
        if (confirm("Are you sure you want to clear all unsaved changes?")) {
            dispatch(clearSsbForm(ocId));
            toast.info("Form cleared");
        }
    };

    const handleAutoSave = useCallback((data: SSBFormData) => {
        const snapshot = cloneSsbFormData(data);
        console.log("Auto-saving to Redux:", snapshot);
        dispatch(saveSsbForm({ ocId, data: snapshot }));
    }, [dispatch, ocId]);

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

                <div className="mt-6 max-w-5xl mx-auto">
                    <SSBReportForm
                        ocId={ocId}
                        report={report}
                        savedFormData={savedFormData}
                        onSave={handleSave}
                        onAutoSave={handleAutoSave}
                        onClear={handleClearForm}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
