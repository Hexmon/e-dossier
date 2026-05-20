"use client";

import React from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

type RetryButtonProps = {
  label?: string;
  className?: string;
};

export function RetryButton({ label = "Retry", className }: RetryButtonProps) {
  return (
    <Button type="button" onClick={() => window.location.reload()} className={className}>
      <RotateCcw className="h-4 w-4" />
      {label}
    </Button>
  );
}
