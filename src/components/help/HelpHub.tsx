import { HelpCard } from '@/components/help/HelpCard';
import { HelpSearch } from '@/components/help/HelpSearch';
import type { HelpCard as HelpCardType, HelpSearchEntry } from '@/types/help';

type HelpHubProps = {
  cards: HelpCardType[];
  searchEntries: HelpSearchEntry[];
};

export function HelpHub({ cards, searchEntries }: HelpHubProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Software Manual</h2>
        <p className="text-sm text-muted-foreground">
          Search setup instructions and operation guides, then jump directly to the relevant card or section.
        </p>
      </div>

      <HelpSearch entries={searchEntries} className="max-w-2xl" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <HelpCard key={card.key} card={card} />
        ))}
      </div>
    </section>
  );
}
