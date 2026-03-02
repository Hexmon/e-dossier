'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

type MermaidBlockProps = {
  chart: string;
};

export function MermaidBlock({ chart }: MermaidBlockProps) {
  const baseId = useId();
  const renderId = useMemo(() => `help-mermaid-${baseId.replace(/[:]/g, '-')}`, [baseId]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'default',
        });

        const result = await mermaid.render(renderId, chart);

        if (!active || !containerRef.current) return;
        containerRef.current.innerHTML = result.svg;
        setError(null);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Unable to render mermaid diagram.');
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [chart, renderId]);

  if (error) {
    return (
      <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
        <p className="text-sm font-medium text-foreground">Mermaid render failed</p>
        <pre className="overflow-auto rounded bg-background p-3 text-xs">{chart}</pre>
      </div>
    );
  }

  return <div ref={containerRef} className="overflow-auto rounded-md border bg-background p-2" />;
}
