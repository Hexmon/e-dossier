"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users } from "lucide-react";

type PlatoonItem = {
  id: string;
  key: string;
  name: string;
  about: string | null;
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
            {platoons.map((platoon, index) => (
              <Card
                key={platoon.id}
                className="group hover:shadow-command transition-all duration-300 border-2 hover:border-accent/20"
              >
                <CardHeader className="pb-3">
                  <div className="w-full h-3 rounded-t-lg bg-gradient-to-r from-blue-500 to-blue-700 mb-4" />
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Shield className="h-6 w-6 text-primary" />
                    {platoon.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {platoon.about || "No platoon description available."}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{platoon.key}</span>
                    </div>

                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/platoon/${platoon.key.toLowerCase()}?idx=${index + 1}`}>More →</Link>
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
