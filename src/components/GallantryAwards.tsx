"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { awards } from "@/config/app.config";

const GallantryAwards = () => {
  return (
    <section id="gallantry-awards" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
            Gallantry Awards
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Honoring the brave souls who exemplify courage, valor, and sacrifice in service to the nation
          </p>
        </div>

        {/* Featured Image */}
        <div className="mb-12 text-center">
          <div className="relative mx-auto rounded-lg overflow-hidden shadow-elegant max-w-2xl w-full h-64">
            <Image
              src="/images/gallantry-awards.jpg"
              alt="Military Gallantry Awards"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Awards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {awards.map((award) => {
            const IconComponent = award.icon;
            return (
              <Card
                key={award.name}
                className="group hover:shadow-command transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-full bg-primary/10">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {award.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {award.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {award.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default GallantryAwards;
