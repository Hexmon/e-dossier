"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RetryButton } from "@/components/ui/retry-button";
import { cn } from "@/lib/utils";

type InlineErrorStateProps = {
  title?: string;
  message: string;
  retryLabel?: string;
  showRetry?: boolean;
  className?: string;
};

export function InlineErrorState({
  title = "Unable to load data",
  message,
  retryLabel = "Retry",
  showRetry = true,
  className,
}: InlineErrorStateProps) {
  return (
    <Alert className={cn("border-border bg-muted/40 text-foreground", className)}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {showRetry ? <RetryButton label={retryLabel} className="mt-2" /> : null}
      </AlertDescription>
    </Alert>
  );
}
