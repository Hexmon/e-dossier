"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import GallantryAwards from "@/components/GallantryAwards";
import PlatoonsSection from "@/components/PlatoonsSection";
import EventsNews from "@/components/EventsNews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Users2 } from "lucide-react";
import { CommandersData, historydata } from "@/config/app.config";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <PlatoonsSection />

      {/* Commander's Corner */}
      <section id="commanders-corner" className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
              Commander's Corner
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Messages and insights from current and former commanders
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {CommandersData.map((commander, index) => (
              <Link
                key={index}
                href={`/commander/${index}`}
                className="group hover:shadow-command transition-all duration-300"
              >
                <Card className="group hover:shadow-command transition-all duration-300">
                  <CardHeader className="text-center pb-3">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-hover rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Users2 className="h-10 w-10 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-lg">{commander.name}</CardTitle>
                    <p className="text-sm text-primary font-medium">{commander.rank}</p>
                    <p className="text-xs text-muted-foreground">{commander.tenure}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-center leading-relaxed">
                      {commander.note}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <GallantryAwards />

      {/* History Section */}
      <section id="history" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
              Our History
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A legacy of excellence in military engineering education
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {historydata.map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-20 text-right">
                    <span className="inline-flex items-center justify-center w-16 h-8 bg-primary text-primary-foreground text-sm font-semibold rounded">
                      {item.year}
                    </span>
                  </div>
                  <div className="flex-1 pb-4 border-l-2 border-primary/20 pl-6 relative">
                    <div className="absolute w-3 h-3 bg-primary rounded-full -left-2 top-1"></div>
                    <p className="text-foreground leading-relaxed">{item.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <EventsNews />

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            For official MCEME internal use only. © 2025 Military College of Electronics & Mechanical Engineering
          </p>
        </div>
      </footer>
    </div>
  );
}
