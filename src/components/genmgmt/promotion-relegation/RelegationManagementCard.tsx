"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import RelegationForm from "@/components/relegation/RelegationForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RelegationManagementCard() {
  const searchParams = useSearchParams();
  const notificationOcId = searchParams?.get("ocId") ?? null;
  const isDisciplineWarning = searchParams?.get("source") === "discipline-warning";

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader>
        <CardTitle>Relegation Management</CardTitle>
        <CardDescription>
          {isDisciplineWarning
            ? "Mark the OC for discipline-ground relegation after the 42-point two-term warning."
            : "Transfer OCs between courses or repeat semesters"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RelegationForm
          prefillOcId={isDisciplineWarning ? notificationOcId : null}
          prefillReason={isDisciplineWarning ? "Discipline grounds: 42 restriction points in two consecutive terms." : undefined}
          initialTransferMode="PREVIOUS_SEMESTER"
          lockOcSelection={isDisciplineWarning && Boolean(notificationOcId)}
          submitLabel={isDisciplineWarning ? "Mark for relegation" : undefined}
        />
      </CardContent>
    </Card>
  );
}
