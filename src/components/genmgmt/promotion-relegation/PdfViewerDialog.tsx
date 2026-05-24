"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { relegationApi } from "@/app/lib/api/relegationApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PdfViewerDialogProps = {
  historyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function PdfViewerDialog({ historyId, open, onOpenChange }: PdfViewerDialogProps) {
  const pdfQuery = useQuery({
    queryKey: ["relegation", "media", "pdf", historyId],
    queryFn: async () => {
      if (!historyId) return null;
      return relegationApi.getMediaPdfBlob(historyId);
    },
    enabled: open && Boolean(historyId),
  });
  const [viewerUrl, setViewerUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!pdfQuery.data) {
      setViewerUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(pdfQuery.data);
    setViewerUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [pdfQuery.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[85vh] max-w-5xl">
        <DialogHeader>
          <DialogTitle>Relegation Document</DialogTitle>
        </DialogHeader>

        {pdfQuery.isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading PDF...
          </div>
        ) : pdfQuery.isError ? (
          <div className="flex h-full items-center justify-center text-sm text-destructive">
            Failed to load PDF.
          </div>
        ) : viewerUrl ? (
          <iframe
            src={viewerUrl}
            className="h-full w-full rounded-md border"
            title="Relegation PDF"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No PDF available.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
