"use client";

import React from "react";
import { SystemUnavailablePanel } from "@/components/system/SystemUnavailablePanel";

export default function AppError() {
  return (
    <SystemUnavailablePanel
      message="The page could not be loaded because a required backend service failed. No data was changed."
      operatorHint="Retry the page. If the problem continues, check the application logs and backend services."
    />
  );
}
