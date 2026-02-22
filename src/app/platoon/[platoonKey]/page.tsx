import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";

import { fetchPublicPlatoon, fetchPublicPlatoonCommanderHistory, fetchPublicSiteHeaderSettings } from "@/app/lib/public-platoons";
import Navbar from "@/components/Navbar";
import PublicCommanderHistory from "@/components/platoon/PublicCommanderHistory";
import SafeImage from "@/components/site-settings/SafeImage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_PLATOON_THEME_COLOR, normalizePlatoonThemeColor } from "@/lib/platoon-theme";

type PlatoonPageProps = {
  params: Promise<{ platoonKey: string }>;
};

export default async function PublicPlatoonPage({ params }: PlatoonPageProps) {
  const { platoonKey: rawPlatoonKey } = await params;
  const platoonKey = decodeURIComponent(rawPlatoonKey || "").trim();
  if (!platoonKey) notFound();

  const [siteHeader, platoon, history] = await Promise.all([
    fetchPublicSiteHeaderSettings(),
    fetchPublicPlatoon(platoonKey),
    fetchPublicPlatoonCommanderHistory(platoonKey),
  ]);

  if (!platoon) notFound();

  return (
    <div className="min-h-screen bg-background">
      <Navbar logoUrl={siteHeader.logoUrl} siteTitle={siteHeader.siteTitle} />

      <main className="container mx-auto space-y-8 px-4 py-8">
        <Link href="/#platoons" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to platoons
        </Link>

        <Card className="overflow-hidden">
          <div
            className="h-2 w-full"
            style={{ backgroundColor: normalizePlatoonThemeColor(platoon.themeColor ?? DEFAULT_PLATOON_THEME_COLOR) }}
          />
          <CardContent className="grid gap-6 p-6 md:grid-cols-[1.1fr_1fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h1 className="text-3xl font-bold">{platoon.name}</h1>
              </div>
              <Badge variant="secondary">{platoon.key}</Badge>
              <p className="text-muted-foreground">
                {platoon.about || "No platoon description is available right now."}
              </p>
            </div>

            <div className="overflow-hidden rounded border">
              <SafeImage
                src={platoon.imageUrl}
                alt={`${platoon.name} platoon`}
                fallbackSrc="/images/commander-placeholder.jpg"
                className="h-64 w-full object-cover"
              />
            </div>
          </CardContent>
        </Card>

        <PublicCommanderHistory items={history?.items ?? []} />
      </main>

      <footer className="bg-primary py-8 text-primary-foreground">
        <section className="container mx-auto px-4 text-center">
          <p className="text-sm">
            For official MCEME internal use only. © 2025 Military College of Electronics & Mechanical Engineering
          </p>
        </section>
      </footer>
    </div>
  );
}
