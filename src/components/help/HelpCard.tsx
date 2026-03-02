import Link from 'next/link';
import { ArrowRight, Clock3 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { HelpCard as HelpCardType } from '@/types/help';

type HelpCardProps = {
  card: HelpCardType;
};

export function HelpCard({ card }: HelpCardProps) {
  const isActive = card.status === 'active';

  return (
    <Card className="h-full border-border/80 shadow-sm">
      <CardHeader className="space-y-2 pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base leading-snug">{card.title}</CardTitle>
          {isActive ? <Badge variant="secondary">Ready</Badge> : <Badge variant="outline">Coming Soon</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{card.summary}</p>
      </CardHeader>
      <CardContent className="pt-0">
        {card.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {card.tags.slice(0, 5).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        {isActive ? (
          <Button asChild className="w-full">
            <Link href={card.route}>
              Open Guide
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled className="w-full">
            <Clock3 className="mr-2 h-4 w-4" />
            In Progress
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
