"use client";

import { useCallback, useState } from "react";

/** Simple local loader state helper */
export function useLoading(initial = false) {
  const [loading, setLoading] = useState(initial);

  const withLoading = useCallback(async <T,>(fn: () => Promise<T>) => {
    setLoading(true);
    try {
      return await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, setLoading, withLoading };
}
