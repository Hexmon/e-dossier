'use client';

import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { MermaidBlock } from '@/components/help/MermaidBlock';
import { cn } from '@/lib/utils';

function flattenText(value: ReactNode): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => flattenText(item)).join('');
  }

  if (value && typeof value === 'object' && 'props' in value) {
    return flattenText((value as { props?: { children?: ReactNode } }).props?.children ?? '');
  }

  return '';
}

function parseHeadingWithAnchor(rawText: string): { text: string; anchor?: string } {
  const match = rawText.match(/^(.*)\s+\{#([a-zA-Z0-9_-]+)\}\s*$/);
  if (!match) {
    return { text: rawText.trim() };
  }

  return {
    text: match[1].trim(),
    anchor: match[2].trim(),
  };
}

type HelpMarkdownRendererProps = {
  markdown: string;
};

export function HelpMarkdownRenderer({ markdown }: HelpMarkdownRendererProps) {
  return (
    <article className="prose prose-slate max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => {
            const parsed = parseHeadingWithAnchor(flattenText(children));
            return (
              <h1 id={parsed.anchor} className="scroll-mt-24 text-3xl font-bold tracking-tight">
                {parsed.text}
              </h1>
            );
          },
          h2: ({ children }) => {
            const parsed = parseHeadingWithAnchor(flattenText(children));
            return (
              <h2 id={parsed.anchor} className="scroll-mt-24 border-b pb-2 text-2xl font-semibold">
                {parsed.text}
              </h2>
            );
          },
          h3: ({ children }) => {
            const parsed = parseHeadingWithAnchor(flattenText(children));
            return (
              <h3 id={parsed.anchor} className="scroll-mt-24 text-xl font-semibold">
                {parsed.text}
              </h3>
            );
          },
          p: ({ children }) => <p className="leading-7 text-foreground/90">{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-7">{children}</li>,
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children, ...props }) => {
            const language = className?.replace('language-', '') ?? '';
            const codeText = String(children).replace(/\n$/, '');

            if (language === 'mermaid') {
              return <MermaidBlock chart={codeText} />;
            }

            return (
              <code
                {...props}
                className={cn(
                  'rounded bg-muted px-1 py-0.5 text-sm',
                  className?.includes('language-') ? 'block overflow-auto p-3 text-xs' : null,
                  className
                )}
              >
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-primary underline underline-offset-4"
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noreferrer noopener' : undefined}
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border bg-muted px-2 py-1 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border px-2 py-1 align-top">{children}</td>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
