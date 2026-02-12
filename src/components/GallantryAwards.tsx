"use client";

import { useMemo, useState } from "react";

import SafeImage from "@/components/site-settings/SafeImage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AwardItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl?: string | null;
};

type GallantryAwardsProps = {
  title?: string;
  description?: string;
  awards?: AwardItem[];
};

const FALLBACK_DESCRIPTION =
  "Honoring the brave souls who exemplify courage, valor, and sacrifice in service to the nation";

const GallantryAwards = ({
  title = "Gallantry Awards",
  description = FALLBACK_DESCRIPTION,
  awards = [],
}: GallantryAwardsProps) => {
  const [expanded, setExpanded] = useState(false);

  const visibleAwards = useMemo(() => {
    if (expanded) return awards;
    return awards.slice(0, 6);
  }, [awards, expanded]);

  return (
    <section id="gallantry-awards" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">{title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{description}</p>
        </div>

        {awards.length === 0 ? (
          <div className="rounded-md border bg-background p-6 text-center text-muted-foreground">
            No awards available.
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleAwards.map((award) => (
                <Card key={award.id} className="group hover:shadow-command transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <SafeImage
                        src={award.imageUrl}
                        alt={award.title}
                        fallbackSrc="/images/gallantry-awards.jpg"
                        width={44}
                        height={44}
                        className="h-11 w-11 rounded border object-cover"
                      />
                      <Badge variant="secondary" className="text-xs">
                        {award.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {award.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{award.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {awards.length > 6 && (
              <div className="mt-6 text-center">
                <Button type="button" variant="outline" onClick={() => setExpanded((prev) => !prev)}>
                  {expanded ? "Show less" : `Show more (${awards.length - 6})`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default GallantryAwards;
