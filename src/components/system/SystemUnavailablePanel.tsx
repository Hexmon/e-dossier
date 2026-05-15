"use client";

import React from "react";
import { AlertTriangle, Database } from "lucide-react";

import { RetryButton } from "@/components/ui/retry-button";

type SystemUnavailablePanelProps = {
  message?: string;
  operatorHint?: string;
};

export function SystemUnavailablePanel({
  message = "The application cannot reach the database right now. Login, setup, and dashboard actions are paused until the service is restored.",
  operatorHint = "Start or check PostgreSQL/Docker database service, then retry this page.",
}: SystemUnavailablePanelProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-2xl rounded-lg border bg-card p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
            <Database className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Service unavailable
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal">
                Database service unavailable
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
            </div>
            <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              {operatorHint}
            </div>
            <RetryButton label="Retry page" />
          </div>
        </div>
      </section>
    </main>
  );
}
