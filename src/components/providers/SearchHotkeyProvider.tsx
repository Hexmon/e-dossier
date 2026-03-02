'use client';

import { useEffect } from 'react';

import { focusBestSearchTarget } from '@/lib/search-hotkey';

export default function SearchHotkeyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.isComposing || event.repeat) return;
      if (event.altKey || event.shiftKey) return;

      const key = event.key.toLowerCase();
      if (!(event.ctrlKey || event.metaKey) || key !== 'p') {
        return;
      }

      const focused = focusBestSearchTarget();
      if (!focused) return;

      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  return <>{children}</>;
}
