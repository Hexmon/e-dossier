import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import GallantryAwards from "@/components/GallantryAwards";
import PlatoonsSection from "@/components/PlatoonsSection";
import EventsNews from "@/components/EventsNews";
import SafeImage from "@/components/site-settings/SafeImage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users2 } from "lucide-react";
import { fetchLandingSiteSettings } from "@/app/lib/public-site-settings";

export default async function Home() {
  const data = await fetchLandingSiteSettings();
  const primaryCommander = data.commanders[0];

  return (
    <div className="min-h-screen bg-background">
      <main>
        <Navbar logoUrl={data.settings.logoUrl} siteTitle={data.settings.heroTitle} />
        <Hero
          title={data.settings.heroTitle}
          description={data.settings.heroDescription}
          commanderName={primaryCommander?.name ?? "Commander"}
          commanderRank={primaryCommander?.tenure ?? "Commander, Cadets Training Wing"}
          commanderImageUrl={primaryCommander?.imageUrl ?? null}
        />
        <PlatoonsSection platoons={data.platoons} />

        <section id="commanders-corner" className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
                {data.settings.commandersSectionTitle}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Messages and insights from current and former commanders
              </p>
            </div>

            {data.commanders.length === 0 ? (
              <div className="rounded-md border bg-muted/20 p-6 text-center text-muted-foreground">
                Commander details are currently unavailable.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {data.commanders.map((commander) => (
                  <Card key={commander.id} className="group hover:shadow-command transition-all duration-300">
                    <CardHeader className="text-center pb-3">
                      <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center border border-primary/30 overflow-hidden">
                        {commander.imageUrl ? (
                          <SafeImage
                            src={commander.imageUrl}
                            alt={commander.name}
                            fallbackSrc="/images/commander-placeholder.jpg"
                            width={80}
                            height={80}
                            className="h-20 w-20 object-cover"
                          />
                        ) : (
                          <Users2 className="h-10 w-10 text-primary" />
                        )}
                      </div>
                      <CardTitle className="text-lg">{commander.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{commander.tenure}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground text-center leading-relaxed">
                        {commander.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        <GallantryAwards title={data.settings.awardsSectionTitle} awards={data.awards} />

        <section id="history" className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
                {data.settings.historySectionTitle}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A legacy of excellence in military engineering education
              </p>
            </div>

            {data.history.length === 0 ? (
              <div className="rounded-md border bg-background p-6 text-center text-muted-foreground">
                History timeline is currently unavailable.
              </div>
            ) : (
              <article className="max-w-4xl mx-auto">
                <div className="space-y-6">
                  {data.history.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="flex-shrink-0 w-20 text-right">
                        <span className="inline-flex items-center justify-center min-w-16 h-8 bg-primary text-primary-foreground text-sm font-semibold rounded px-2">
                          {item.yearOrDate}
                        </span>
                      </div>
                      <div className="flex-1 pb-4 border-l-2 border-primary/20 pl-6 relative">
                        <div className="absolute w-3 h-3 bg-primary rounded-full -left-2 top-1"></div>
                        <p className="text-foreground leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}
          </div>
        </section>

        <EventsNews />
      </main>

      <footer className="bg-primary text-primary-foreground py-8">
        <section className="container mx-auto px-4 text-center">
          <p className="text-sm">
            For official MCEME internal use only. © 2025 Military College of Electronics & Mechanical Engineering
          </p>
        </section>
      </footer>
    </div>
  );
}
