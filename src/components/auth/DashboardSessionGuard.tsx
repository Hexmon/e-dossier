"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logoutAndRedirect } from "@/lib/auth/logout";

export default function DashboardSessionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const checkInFlightRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const verifySession = async () => {
      if (checkInFlightRef.current) return;
      checkInFlightRef.current = true;

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
      }
    };

    void verifySession();

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
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname]);

  return <>{children}</>;
}
