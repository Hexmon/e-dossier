"use client";

import { useState } from "react";
import RelegationForm from "@/components/relegation/RelegationForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PromotionRelegationCourseOption } from "@/hooks/usePromotionRelegationMgmt";
import RelegationHistoryTable from "./RelegationHistoryTable";
import PdfViewerDialog from "./PdfViewerDialog";

type RelegationManagementCardProps = {
  courses: PromotionRelegationCourseOption[];
};

export default function RelegationManagementCard({ courses }: RelegationManagementCardProps) {
  const [pdfHistoryId, setPdfHistoryId] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);

  const handleViewPdf = (historyId: string) => {
    setPdfHistoryId(historyId);
    setPdfOpen(true);
  };

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader>
        <CardTitle>Relegation Management</CardTitle>
        <CardDescription>Transfer OCs and view complete relegation history</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RelegationForm />
        <RelegationHistoryTable courses={courses} onViewPdf={handleViewPdf} />
      </CardContent>

      <PdfViewerDialog
        historyId={pdfHistoryId}
        open={pdfOpen}
        onOpenChange={(open) => {
          setPdfOpen(open);
          if (!open) setPdfHistoryId(null);
        }}
      />
    </Card>
  );
}
