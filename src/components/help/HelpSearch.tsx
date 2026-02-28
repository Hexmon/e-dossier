'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Search, Tag } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { HelpSearchEntry } from '@/types/help';

type HelpSearchProps = {
  entries: HelpSearchEntry[];
  className?: string;
};

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function scoreEntry(entry: HelpSearchEntry, query: string): number {
  const q = normalize(query);
  if (!q) return 0;

  const title = normalize(entry.title);
  const subtitle = normalize(entry.subtitle);
  const keywords = entry.keywords.map(normalize);

  if (title === q) return 120;
  if (title.startsWith(q)) return 100;
  if (title.includes(q)) return 80;
  if (subtitle.includes(q)) return 60;
  if (keywords.some((keyword) => keyword.includes(q))) return 40;

  return 0;
}

export function HelpSearch({ entries, className }: HelpSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return entries.slice(0, 8);

    return entries
      .map((entry) => ({ entry, score: scoreEntry(entry, q) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
      .slice(0, 10)
      .map((item) => item.entry);
  }, [entries, query]);

  const onPick = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          placeholder="Search setup steps, commands, or sections..."
          className="pl-9"
        />
      </div>

      {open ? (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border bg-popover shadow-lg">
          {results.length > 0 ? (
            <ul className="py-1">
              {results.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onPick(entry.href)}
                    className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-accent"
                  >
                    {entry.type === 'card' ? (
                      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Tag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{entry.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{entry.subtitle}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm text-muted-foreground">No matching help entries found.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
