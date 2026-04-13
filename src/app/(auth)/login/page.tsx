import { Suspense } from "react";

import LoginPageClient from "@/components/auth/LoginPageClient";
import { getSetupStatus } from "@/app/lib/setup-status";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const setupStatus = await getSetupStatus();

  return (
    <Suspense fallback={null}>
      <LoginPageClient bootstrapRequired={setupStatus.bootstrapRequired} />
    </Suspense>
  );
}
