"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users } from "lucide-react";
import { platoons } from "@/config/app.config";

const PlatoonsSection = () => {
  return (
    <section id="platoons" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
            Platoons & Traditions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Six distinguished platoons, each with their own heritage and tradition of excellence
          </p>
        </div>

        {/* Platoon Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platoons.map((platoon) => (
            <Card
              key={platoon.name}
              className="group hover:shadow-command transition-all duration-300 border-2 hover:border-accent/20"
            >
              <CardHeader className="pb-3">
                <div className={`w-full h-3 rounded-t-lg ${platoon.color} mb-4`} />
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Shield className="h-6 w-6 text-primary" />
                  {platoon.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {platoon.tradition}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Active Platoon</span>
                  </div>

                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/platoon/${platoon.tradition || platoon.name.toLowerCase()}`}>
                      More →
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatoonsSection;
