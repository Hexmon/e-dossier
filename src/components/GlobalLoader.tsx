"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Global full-screen loader that listens to `api:loading` events.
 * Shows after `threshold` ms to avoid flicker on very fast requests.
 */
export default function GlobalLoader({ threshold = 150 }: { threshold?: number }) {
    const [pending, setPending] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onLoading = (e: Event) => {
            // We dispatch CustomEvent with detail: { delta: +1/-1 }
            const ce = e as CustomEvent<{ delta: number }>;
            const delta = ce.detail?.delta ?? 0;
            // ensure never negative
            setPending((p) => Math.max(0, p + delta));
        };

        if (typeof window !== "undefined") {
            window.addEventListener("api:loading", onLoading as EventListener);
            return () => window.removeEventListener("api:loading", onLoading as EventListener);
        }
    }, []);

    useEffect(() => {
        // Debounce visibility to avoid flicker
        if (pending > 0) {
            const t = setTimeout(() => setVisible(true), threshold);
            return () => clearTimeout(t);
        }
        setVisible(false);
    }, [pending, threshold]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/40 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 shadow">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading…</span>
            </div>
        </div>
    );
}
