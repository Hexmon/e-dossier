"use client";

import { useMemo, useState } from "react";

type SafeImageProps = {
  src: string | null | undefined;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  width?: number;
  height?: number;
};

export default function SafeImage({
  src,
  alt,
  fallbackSrc = "/images/commander-placeholder.jpg",
  className,
  width,
  height,
}: SafeImageProps) {
  const safeSrc = useMemo(() => {
    const trimmed = String(src ?? "").trim();
    if (!trimmed) return fallbackSrc;
    return trimmed;
  }, [fallbackSrc, src]);

  const [currentSrc, setCurrentSrc] = useState(safeSrc);

  return (
    <img
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
