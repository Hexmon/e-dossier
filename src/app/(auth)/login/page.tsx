import React, { Suspense } from "react";

import LoginPageClient from "@/components/auth/LoginPageClient";
import { SystemUnavailablePanel } from "@/components/system/SystemUnavailablePanel";
import { getSetupStatus, isSetupStatusUnavailable } from "@/app/lib/setup-status";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const setupStatus = await getSetupStatus();

  if (isSetupStatusUnavailable(setupStatus)) {
    return <SystemUnavailablePanel message={setupStatus.availability.message} />;
  }

  return (
    <Suspense fallback={null}>
      <LoginPageClient
        bootstrapRequired={setupStatus.bootstrapRequired}
        setupComplete={setupStatus.setupComplete}
      />
    </Suspense>
  );
}
