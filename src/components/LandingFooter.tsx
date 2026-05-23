"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type LandingFooterProps = {
  footer: string;
};

function shouldDockFooter(wrapperTop: number, viewportHeight: number, footerHeight: number) {
  return wrapperTop <= viewportHeight - footerHeight;
}

export default function LandingFooter({ footer }: LandingFooterProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  const [isDocked, setIsDocked] = useState(false);

  const updateFooterState = useCallback(() => {
    const wrapper = wrapperRef.current;
    const footerElement = footerRef.current;
    if (!wrapper || !footerElement) return;

    const measuredHeight = footerElement.offsetHeight;
    const wrapperTop = wrapper.getBoundingClientRect().top;
    const viewportHeight = window.innerHeight;

    setFooterHeight(measuredHeight);
    setIsDocked(shouldDockFooter(wrapperTop, viewportHeight, measuredHeight));
  }, []);

  useEffect(() => {
    updateFooterState();

    window.addEventListener("scroll", updateFooterState, { passive: true });
    window.addEventListener("resize", updateFooterState);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateFooterState)
        : null;

    if (resizeObserver && footerRef.current) {
      resizeObserver.observe(footerRef.current);
    }

    return () => {
      window.removeEventListener("scroll", updateFooterState);
      window.removeEventListener("resize", updateFooterState);
      resizeObserver?.disconnect();
    };
  }, [updateFooterState]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      style={{ minHeight: footerHeight || undefined }}
      data-footer-slot="landing"
    >
      <footer
        ref={footerRef}
        data-footer-state={isDocked ? "docked" : "pinned"}
        className={[
          "bg-primary py-3 text-primary-foreground/90",
          "transition-[box-shadow,transform] duration-300 ease-out will-change-transform",
          isDocked
            ? "relative z-0 shadow-none"
            : "fixed inset-x-0 bottom-0 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.18)]",
        ].join(" ")}
      >
        <section className="container mx-auto px-4 text-center">
          <p className="whitespace-pre-line break-words text-sm leading-relaxed text-shadow-md">
            {footer}
          </p>
        </section>
      </footer>
    </div>
  );
}

export { shouldDockFooter };
