"use client";

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
  const signedUrlQuery = useQuery({
    queryKey: ["relegation", "media", historyId],
    queryFn: async () => {
      if (!historyId) return null;
      return relegationApi.getMediaSignedUrl(historyId);
    },
    enabled: open && Boolean(historyId),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[85vh] max-w-5xl">
        <DialogHeader>
          <DialogTitle>Relegation Document</DialogTitle>
        </DialogHeader>

        {signedUrlQuery.isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading PDF...
          </div>
        ) : signedUrlQuery.isError ? (
          <div className="flex h-full items-center justify-center text-sm text-destructive">
            Failed to load PDF.
          </div>
        ) : signedUrlQuery.data?.signedUrl ? (
          <iframe
            src={signedUrlQuery.data.signedUrl}
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
