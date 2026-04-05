"use client";

import React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SetupStepKey } from "@/app/lib/setup-status";

type SetupResumeBannerProps = {
  visible: boolean;
  setupComplete: boolean;
  nextStep: SetupStepKey | null;
};

const STEP_LABELS: Record<SetupStepKey, string> = {
  superAdmin: "Super Admin",
  platoons: "Platoons",
  hierarchy: "Hierarchy",
  courses: "Courses",
  offerings: "Offerings / Semesters",
  ocs: "Officer Cadets",
};

export function SetupResumeBanner({
  visible,
  setupComplete,
  nextStep,
}: SetupResumeBannerProps) {
  if (!visible || setupComplete) {
    return null;
  }

  return (
    <Card className="mb-6 border-warning/30 bg-warning/20">
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-warning-foreground">Initial setup is still incomplete.</p>
          <p className="text-sm text-warning-foreground/80">
            Continue setup to finish the remaining foundation steps. Next step:{" "}
            <span className="font-medium">{nextStep ? STEP_LABELS[nextStep] : "complete"}</span>.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/setup">Resume Setup</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
