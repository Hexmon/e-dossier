"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logoutAndRedirect } from "@/lib/auth/logout";

export default function DashboardSessionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checkingInitialSession, setCheckingInitialSession] = useState(true);
  const checkInFlightRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const verifySession = async (initial = false) => {
      if (checkInFlightRef.current) return;
      checkInFlightRef.current = true;

      if (initial && mounted) {
        setCheckingInitialSession(true);
      }

      try {
        const response = await fetch("/api/v1/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-store",
          },
        });

        if (response.status === 401) {
          void logoutAndRedirect({
            reason: "unauthorized",
            preserveNext: true,
            router,
            showServerErrorToast: false,
          });
          return;
        }
      } catch {
        // Keep existing screen for transient failures.
      } finally {
        checkInFlightRef.current = false;
        if (initial && mounted) {
          setCheckingInitialSession(false);
        }
      }
    };

    // Prevent indefinite blank screen if network/auth check stalls.
    const initialGuardTimeout = window.setTimeout(() => {
      if (mounted) {
        setCheckingInitialSession(false);
      }
    }, 3000);

    void verifySession(true);

    const onFocus = () => {
      void verifySession();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void verifySession();
      }
    };

    const onPageShow = () => {
      void verifySession();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mounted = false;
      window.clearTimeout(initialGuardTimeout);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname]);

  if (checkingInitialSession) {
    return null;
  }

  return <>{children}</>;
}
