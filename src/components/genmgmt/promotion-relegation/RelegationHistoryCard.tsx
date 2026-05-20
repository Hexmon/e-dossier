"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PromotionRelegationCourseOption } from "@/hooks/usePromotionRelegationMgmt";
import { useRelegationActions } from "@/hooks/useRelegation";
import EnrollmentHistoryDialog from "./EnrollmentHistoryDialog";
import PdfViewerDialog from "./PdfViewerDialog";
import RelegationHistoryTable from "./RelegationHistoryTable";

type RelegationHistoryCardProps = {
  courses: PromotionRelegationCourseOption[];
};

export default function RelegationHistoryCard({ courses }: RelegationHistoryCardProps) {
  const [pdfHistoryId, setPdfHistoryId] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [selectedOcForEnrollments, setSelectedOcForEnrollments] = useState<{
    ocId: string;
    ocName: string;
  } | null>(null);
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);

  const { voidPromotion, voidPromotionMutation } = useRelegationActions();
  const voidingOcId =
    voidPromotionMutation.isPending && voidPromotionMutation.variables
      ? (voidPromotionMutation.variables as { ocId?: string }).ocId ?? null
      : null;

  const handleViewPdf = (historyId: string) => {
    setPdfHistoryId(historyId);
    setPdfOpen(true);
  };

  const handleViewEnrollments = (ocId: string, ocName: string) => {
    setSelectedOcForEnrollments({ ocId, ocName });
    setEnrollmentDialogOpen(true);
  };

  const handleVoidPromotion = async (ocId: string, ocNo: string) => {
    try {
      await voidPromotion({
        ocId,
        reason: `Late relegation correction for ${ocNo}`,
        remark: null,
      });
      toast.success(`Promotion voided for OC ${ocNo}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to void promotion.";
      toast.error(message);
    }
  };

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader>
        <CardTitle>Relegation History</CardTitle>
        <CardDescription>Search and audit all promotion, relegation, and transfer movements</CardDescription>
      </CardHeader>
      <CardContent>
        <RelegationHistoryTable
          courses={courses}
          onViewPdf={handleViewPdf}
          onViewEnrollments={handleViewEnrollments}
          onVoidPromotion={handleVoidPromotion}
          voidingOcId={voidingOcId}
        />
      </CardContent>

      <PdfViewerDialog
        historyId={pdfHistoryId}
        open={pdfOpen}
        onOpenChange={(open) => {
          setPdfOpen(open);
          if (!open) setPdfHistoryId(null);
        }}
      />

      <EnrollmentHistoryDialog
        open={enrollmentDialogOpen}
        onOpenChange={(open) => {
          setEnrollmentDialogOpen(open);
          if (!open) setSelectedOcForEnrollments(null);
        }}
        ocId={selectedOcForEnrollments?.ocId ?? null}
        ocName={selectedOcForEnrollments?.ocName ?? null}
      />
    </Card>
  );
}
