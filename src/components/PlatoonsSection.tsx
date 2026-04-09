"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users } from "lucide-react";
import SafeImage from "@/components/site-settings/SafeImage";
import { DEFAULT_PLATOON_THEME_COLOR, normalizePlatoonThemeColor } from "@/lib/platoon-theme";

type PlatoonItem = {
  id: string;
  key: string;
  name: string;
  about: string | null;
  themeColor: string;
  imageUrl: string | null;
};

type PlatoonsSectionProps = {
  platoons?: PlatoonItem[];
  title?: string;
  description?: string;
};

const PlatoonsSection = ({
  platoons = [],
  title = "Platoons & Traditions",
  description = "Six distinguished platoons, each with their own heritage and tradition of excellence",
}: PlatoonsSectionProps) => {
  return (
    <section id="platoons" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">{title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{description}</p>
        </div>

        {platoons.length === 0 ? (
          <div className="rounded-md border bg-muted/20 p-6 text-center text-muted-foreground">
            Unable to load platoons at the moment.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platoons.map((platoon) => (
              <Card
                key={platoon.id}
                className="group flex h-full min-w-0 flex-col overflow-hidden border-2 transition-all duration-300 hover:border-accent/20 hover:shadow-command"
              >
                <CardHeader className="pb-3">
                  <div
                    className="w-full h-3 rounded-t-lg mb-4"
                    style={{ backgroundColor: normalizePlatoonThemeColor(platoon.themeColor ?? DEFAULT_PLATOON_THEME_COLOR) }}
                  />
                  <CardTitle className="flex min-w-0 items-start gap-3 text-xl">
                    <Shield className="h-6 w-6 shrink-0 text-primary" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                      {platoon.name}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex min-w-0 flex-1 flex-col">
                  <div className="mb-4 overflow-hidden rounded border bg-muted/20">
                    <SafeImage
                      src={platoon.imageUrl}
                      fallbackSrc="/images/commander-placeholder.jpg"
                      alt={`${platoon.name} platoon`}
                      className="h-[200px] w-full object-contain sm:h-[220px] lg:h-[240px] xl:h-[260px]"
                    />
                  </div>
                  <p className="mb-4 min-w-0 break-words leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                    {platoon.about || "No platoon description available."}
                  </p>

                  <div className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                        {platoon.key}
                      </span>
                    </div>

                    <Button variant="ghost" size="sm" asChild className="shrink-0">
                      <Link href={`/platoon/${platoon.key.toLowerCase()}`}>More →</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PlatoonsSection;
